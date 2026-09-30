import 'server-only'
import { and, asc, eq, inArray, lte, notInArray, sql, desc, or, isNull, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { campaigns, calls, leads, type Campaign, type ColumnMap, type Lead } from '@/lib/db/schema'
import { readSheet, writeCells, writeHeaders } from '@/lib/google'
import { HttpError } from '@/lib/session'
import { RESULT_HEADERS, STATUS_LABELS, DISPOSITION_MAP, type LeadStatus, type DispositionId } from '@/lib/dispositions'

const RETRY_COOLDOWN_MINUTES = 60

export async function getCampaign(userId: string, campaignId: number) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
  if (!campaign) throw new HttpError(404, 'Campaña no encontrada')
  return campaign
}

export async function campaignStats(userId: string, campaignIds?: number[]) {
  const rows = await db
    .select({
      campaignId: leads.campaignId,
      total: sql<number>`count(*)::int`,
      new: sql<number>`count(*) filter (where ${leads.status} = 'new')::int`,
      callback: sql<number>`count(*) filter (where ${leads.status} = 'callback')::int`,
      callbackDue: sql<number>`count(*) filter (where ${leads.status} = 'callback' and ${leads.callbackAt} <= now())::int`,
      retry: sql<number>`count(*) filter (where ${leads.status} = 'retry')::int`,
      completed: sql<number>`count(*) filter (where ${leads.status} = 'completed')::int`,
      dnc: sql<number>`count(*) filter (where ${leads.status} = 'dnc')::int`,
      positive: sql<number>`count(*) filter (where ${leads.disposition} in ('sale','interested'))::int`,
      sales: sql<number>`count(*) filter (where ${leads.disposition} = 'sale')::int`,
      contacted: sql<number>`count(*) filter (where ${leads.attempts} > 0)::int`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.userId, userId),
        campaignIds && campaignIds.length ? inArray(leads.campaignId, campaignIds) : undefined,
      ),
    )
    .groupBy(leads.campaignId)
  return rows
}

export async function callStats(userId: string, campaignId: number) {
  const [row] = await db
    .select({
      totalCalls: sql<number>`count(*)::int`,
      today: sql<number>`count(*) filter (where ${calls.startedAt} >= date_trunc('day', now()))::int`,
      talkSeconds: sql<number>`coalesce(sum(${calls.durationSec}), 0)::int`,
      avgSeconds: sql<number>`coalesce(avg(${calls.durationSec}) filter (where ${calls.durationSec} > 0), 0)::int`,
    })
    .from(calls)
    .where(and(eq(calls.userId, userId), eq(calls.campaignId, campaignId)))
  return row
}

function findHeader(headers: string[], candidates: RegExp) {
  const idx = headers.findIndex((h) => candidates.test(h.trim().toLowerCase()))
  return idx >= 0 ? idx : undefined
}

export function guessColumnMap(headers: string[]) {
  return {
    name: findHeader(headers, /^(nombre|name|full name|nombre completo|contacto|contact)/),
    phone: findHeader(headers, /(tel|phone|móvil|movil|celular|mobile|número|numero)/),
    email: findHeader(headers, /(e-?mail|correo)/),
    company: findHeader(headers, /(empresa|company|compañía|compania|negocio|business)/),
  }
}

export async function ensureResultColumns(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
) {
  const next = [...headers]
  const indexOf = (label: string) => {
    let idx = next.findIndex((h) => h.trim() === label)
    if (idx < 0) {
      next.push(label)
      idx = next.length - 1
    }
    return idx
  }
  const map = {
    status: indexOf(RESULT_HEADERS.status),
    disposition: indexOf(RESULT_HEADERS.disposition),
    attempts: indexOf(RESULT_HEADERS.attempts),
    lastCalled: indexOf(RESULT_HEADERS.lastCalled),
    callback: indexOf(RESULT_HEADERS.callback),
    notes: indexOf(RESULT_HEADERS.notes),
  }
  if (next.length !== headers.length) {
    await writeHeaders(userId, spreadsheetId, sheetName, next)
  }
  return { headers: next, map }
}

const statusFromLabel = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([k, v]) => [v.toLowerCase(), k as LeadStatus]),
)

export async function syncCampaign(userId: string, campaign: Campaign) {
  await flushPendingWrites(userId, campaign)

  const values = await readSheet(userId, campaign.spreadsheetId, campaign.sheetName)
  const [headerRow = [], ...rows] = values
  const map = campaign.columnMap
  const standard = new Set(
    [map.name, map.phone, map.email, map.company, map.status, map.disposition, map.attempts, map.lastCalled, map.callback, map.notes].filter(
      (v): v is number => typeof v === 'number',
    ),
  )

  const records = rows
    .map((row, i) => {
      const cell = (idx?: number) => (idx === undefined ? '' : (row[idx] ?? '').toString().trim())
      const phone = cell(map.phone)
      if (!phone && !cell(map.name)) return null
      const extra: Record<string, string> = {}
      headerRow.forEach((h, idx) => {
        if (!standard.has(idx) && h && row[idx]) extra[h] = String(row[idx])
      })
      const sheetStatus = statusFromLabel[cell(map.status).toLowerCase()]
      const attempts = Number.parseInt(cell(map.attempts), 10)
      const callbackRaw = cell(map.callback)
      const callbackDate = callbackRaw ? new Date(callbackRaw) : null
      return {
        userId,
        campaignId: campaign.id,
        rowNumber: i + 2,
        name: cell(map.name) || null,
        phone: phone || null,
        email: cell(map.email) || null,
        company: cell(map.company) || null,
        extra,
        status: sheetStatus ?? 'new',
        disposition: cell(map.disposition) ? findDispositionId(cell(map.disposition)) : null,
        attempts: Number.isFinite(attempts) ? attempts : 0,
        callbackAt: callbackDate && !Number.isNaN(callbackDate.getTime()) ? callbackDate : null,
        notes: cell(map.notes) || null,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500)
    await db
      .insert(leads)
      .values(chunk)
      .onConflictDoUpdate({
        target: [leads.campaignId, leads.rowNumber],
        set: {
          name: sql`excluded.name`,
          phone: sql`excluded.phone`,
          email: sql`excluded.email`,
          company: sql`excluded.company`,
          extra: sql`excluded.extra`,
        },
      })
  }

  const rowNumbers = records.map((r) => r.rowNumber)
  await db
    .delete(leads)
    .where(
      and(
        eq(leads.userId, userId),
        eq(leads.campaignId, campaign.id),
        rowNumbers.length ? notInArray(leads.rowNumber, rowNumbers) : undefined,
      ),
    )

  await db
    .update(campaigns)
    .set({ lastSyncedAt: new Date(), headers: headerRow.map(String) })
    .where(and(eq(campaigns.id, campaign.id), eq(campaigns.userId, userId)))

  return { imported: records.length }
}

function findDispositionId(label: string): DispositionId | null {
  const found = Object.values(DISPOSITION_MAP).find((d) => d.label.toLowerCase() === label.toLowerCase())
  return found?.id ?? null
}

function formatSheetDate(date: Date | null) {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function leadCells(map: ColumnMap, lead: Lead) {
  return [
    { row: lead.rowNumber, col: map.status, value: STATUS_LABELS[lead.status as LeadStatus] ?? lead.status },
    {
      row: lead.rowNumber,
      col: map.disposition,
      value: lead.disposition ? (DISPOSITION_MAP[lead.disposition as DispositionId]?.label ?? lead.disposition) : '',
    },
    { row: lead.rowNumber, col: map.attempts, value: String(lead.attempts) },
    { row: lead.rowNumber, col: map.lastCalled, value: formatSheetDate(lead.lastCalledAt) },
    { row: lead.rowNumber, col: map.callback, value: formatSheetDate(lead.callbackAt) },
    { row: lead.rowNumber, col: map.notes, value: lead.notes ?? '' },
  ]
}

export async function writeLeadToSheet(userId: string, campaign: Campaign, lead: Lead) {
  try {
    await writeCells(userId, campaign.spreadsheetId, campaign.sheetName, leadCells(campaign.columnMap, lead))
    await db
      .update(leads)
      .set({ syncPending: false })
      .where(and(eq(leads.id, lead.id), eq(leads.userId, userId)))
    return true
  } catch (error) {
    console.error('[sync] write-back failed; marked pending', error instanceof Error ? error.message : error)
    await db
      .update(leads)
      .set({ syncPending: true })
      .where(and(eq(leads.id, lead.id), eq(leads.userId, userId)))
    return false
  }
}

export async function flushPendingWrites(userId: string, campaign: Campaign) {
  const pending = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.campaignId, campaign.id), eq(leads.syncPending, true)))
  if (!pending.length) return 0
  await writeCells(
    userId,
    campaign.spreadsheetId,
    campaign.sheetName,
    pending.flatMap((l) => leadCells(campaign.columnMap, l)),
  )
  await db
    .update(leads)
    .set({ syncPending: false })
    .where(and(eq(leads.userId, userId), inArray(leads.id, pending.map((l) => l.id))))
  return pending.length
}

export async function getNextLead(userId: string, campaign: Campaign, skipIds: number[]) {
  const base = and(
    eq(leads.userId, userId),
    eq(leads.campaignId, campaign.id),
    skipIds.length ? notInArray(leads.id, skipIds) : undefined,
  )
  const cooldown = new Date(Date.now() - RETRY_COOLDOWN_MINUTES * 60_000)

  const [due] = await db
    .select()
    .from(leads)
    .where(and(base, eq(leads.status, 'callback'), lte(leads.callbackAt, new Date())))
    .orderBy(asc(leads.callbackAt))
    .limit(1)
  if (due) return { lead: due, reason: 'callback' as const }

  const [fresh] = await db
    .select()
    .from(leads)
    .where(and(base, eq(leads.status, 'new')))
    .orderBy(asc(leads.rowNumber))
    .limit(1)
  if (fresh) return { lead: fresh, reason: 'new' as const }

  const [retry] = await db
    .select()
    .from(leads)
    .where(
      and(
        base,
        eq(leads.status, 'retry'),
        lt(leads.attempts, campaign.maxAttempts),
        or(isNull(leads.lastCalledAt), lte(leads.lastCalledAt, cooldown)),
      ),
    )
    .orderBy(asc(leads.lastCalledAt))
    .limit(1)
  if (retry) return { lead: retry, reason: 'retry' as const }

  return { lead: null, reason: 'empty' as const }
}

export async function getUpcomingQueue(userId: string, campaign: Campaign, limit = 25) {
  const cooldown = new Date(Date.now() - RETRY_COOLDOWN_MINUTES * 60_000)
  return db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.userId, userId),
        eq(leads.campaignId, campaign.id),
        or(
          and(eq(leads.status, 'callback'), lte(leads.callbackAt, new Date())),
          eq(leads.status, 'new'),
          and(
            eq(leads.status, 'retry'),
            lt(leads.attempts, campaign.maxAttempts),
            or(isNull(leads.lastCalledAt), lte(leads.lastCalledAt, cooldown)),
          ),
        ),
      ),
    )
    .orderBy(
      sql`case when ${leads.status} = 'callback' then 0 when ${leads.status} = 'new' then 1 else 2 end`,
      asc(leads.callbackAt),
      asc(leads.rowNumber),
    )
    .limit(limit)
}

export async function getScheduledCallbacks(userId: string, campaignId: number) {
  return db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.campaignId, campaignId), eq(leads.status, 'callback')))
    .orderBy(asc(leads.callbackAt))
    .limit(50)
}

export async function getLeadCalls(userId: string, leadId: number) {
  return db
    .select()
    .from(calls)
    .where(and(eq(calls.userId, userId), eq(calls.leadId, leadId)))
    .orderBy(desc(calls.startedAt))
    .limit(20)
}
