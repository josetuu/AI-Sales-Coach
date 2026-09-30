import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calls, campaigns, leads } from '@/lib/db/schema'
import { apiUser, handleApiError } from '@/lib/session'
import { callStats, campaignStats, getCampaign, getScheduledCallbacks } from '@/lib/campaigns'
import { normalizePhone } from '@/lib/ringcentral'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await apiUser()
    const campaign = await getCampaign(user.id, Number((await params).id))
    const [[stats], callSummary, callbacks, recentCalls] = await Promise.all([
      campaignStats(user.id, [campaign.id]),
      callStats(user.id, campaign.id),
      getScheduledCallbacks(user.id, campaign.id),
      db
        .select({
          id: calls.id,
          status: calls.status,
          disposition: calls.disposition,
          startedAt: calls.startedAt,
          durationSec: calls.durationSec,
          notes: calls.notes,
          leadName: leads.name,
          leadPhone: leads.phone,
        })
        .from(calls)
        .leftJoin(leads, eq(leads.id, calls.leadId))
        .where(and(eq(calls.userId, user.id), eq(calls.campaignId, campaign.id)))
        .orderBy(desc(calls.startedAt))
        .limit(15),
    ])
    return NextResponse.json({ campaign, stats: stats ?? null, callSummary, callbacks, recentCalls })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await apiUser()
    const campaign = await getCampaign(user.id, Number((await params).id))
    const body = (await request.json()) as {
      name?: string
      agentPhone?: string
      maxAttempts?: number
      autoAdvance?: boolean
      script?: string
    }
    const [updated] = await db
      .update(campaigns)
      .set({
        ...(body.name?.trim() ? { name: body.name.trim().slice(0, 120) } : {}),
        ...(body.agentPhone !== undefined ? { agentPhone: normalizePhone(body.agentPhone) } : {}),
        ...(body.maxAttempts ? { maxAttempts: Math.min(Math.max(Number(body.maxAttempts), 1), 10) } : {}),
        ...(typeof body.autoAdvance === 'boolean' ? { autoAdvance: body.autoAdvance } : {}),
        ...(body.script !== undefined ? { script: body.script.slice(0, 10_000) } : {}),
      })
      .where(and(eq(campaigns.id, campaign.id), eq(campaigns.userId, user.id)))
      .returning()
    return NextResponse.json({ campaign: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await apiUser()
    const campaign = await getCampaign(user.id, Number((await params).id))
    await db.delete(calls).where(and(eq(calls.userId, user.id), eq(calls.campaignId, campaign.id)))
    await db.delete(leads).where(and(eq(leads.userId, user.id), eq(leads.campaignId, campaign.id)))
    await db.delete(campaigns).where(and(eq(campaigns.userId, user.id), eq(campaigns.id, campaign.id)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
