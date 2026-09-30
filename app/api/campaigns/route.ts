import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'
import { apiUser, handleApiError, HttpError } from '@/lib/session'
import { campaignStats, ensureResultColumns, syncCampaign } from '@/lib/campaigns'
import { getSpreadsheetMeta, readSheet } from '@/lib/google'
import { normalizePhone } from '@/lib/ringcentral'

export async function GET() {
  try {
    const user = await apiUser()
    const list = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, user.id))
      .orderBy(desc(campaigns.createdAt))
    const stats = await campaignStats(user.id)
    return NextResponse.json({
      campaigns: list.map((c) => ({ ...c, stats: stats.find((s) => s.campaignId === c.id) ?? null })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

type CreateBody = {
  name?: string
  spreadsheetId?: string
  sheetName?: string
  columns?: { name?: number; phone?: number; email?: number; company?: number }
  agentPhone?: string
  maxAttempts?: number
}

const optionalIndex = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : undefined)

export async function POST(request: Request) {
  try {
    const user = await apiUser()
    const body = (await request.json()) as CreateBody
    const name = body.name?.trim().slice(0, 120)
    const spreadsheetId = body.spreadsheetId?.trim()
    const sheetName = body.sheetName?.trim()
    const phoneIdx = optionalIndex(body.columns?.phone)
    if (!name || !spreadsheetId || !sheetName || phoneIdx === undefined) {
      throw new HttpError(400, 'Faltan campos obligatorios (nombre, hoja, pestaña y columna de teléfono)')
    }
    const agentPhone = body.agentPhone ? normalizePhone(body.agentPhone) : null
    const maxAttempts = Math.min(Math.max(Number(body.maxAttempts) || 3, 1), 10)

    const meta = await getSpreadsheetMeta(user.id, spreadsheetId)
    if (!meta.sheets.includes(sheetName)) throw new HttpError(400, 'Pestaña no encontrada')
    const [headerRow = []] = await readSheet(user.id, spreadsheetId, sheetName)
    const { headers, map } = await ensureResultColumns(user.id, spreadsheetId, sheetName, headerRow.map(String))

    const [campaign] = await db
      .insert(campaigns)
      .values({
        userId: user.id,
        name,
        spreadsheetId,
        spreadsheetTitle: meta.title,
        sheetName,
        headers,
        agentPhone,
        maxAttempts,
        columnMap: {
          name: optionalIndex(body.columns?.name),
          phone: phoneIdx,
          email: optionalIndex(body.columns?.email),
          company: optionalIndex(body.columns?.company),
          ...map,
        },
      })
      .returning()

    try {
      const result = await syncCampaign(user.id, campaign)
      return NextResponse.json({ campaign, ...result })
    } catch (error) {
      await db.delete(campaigns).where(and(eq(campaigns.id, campaign.id), eq(campaigns.userId, user.id)))
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}
