import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calls, leads } from '@/lib/db/schema'
import { apiUser, handleApiError, HttpError } from '@/lib/session'
import { getCampaign, writeLeadToSheet } from '@/lib/campaigns'
import { DISPOSITION_MAP, type DispositionId } from '@/lib/dispositions'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await apiUser()
    const leadId = Number((await params).id)
    const body = (await request.json()) as {
      disposition?: string
      notes?: string
      callbackAt?: string
      callId?: number
    }
    const disposition = DISPOSITION_MAP[body.disposition as DispositionId]
    if (!disposition) throw new HttpError(400, 'Disposición inválida')

    const [lead] = await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.userId, user.id)))
    if (!lead) throw new HttpError(404, 'Lead no encontrado')
    const campaign = await getCampaign(user.id, lead.campaignId)

    let callbackAt: Date | null = null
    if (disposition.id === 'callback') {
      callbackAt = body.callbackAt ? new Date(body.callbackAt) : null
      if (!callbackAt || Number.isNaN(callbackAt.getTime())) throw new HttpError(400, 'Indica fecha y hora del callback')
    }

    const notes = body.notes?.trim().slice(0, 4000) || null
    const attempts = lead.attempts + 1
    let status: string = disposition.nextStatus
    if (status === 'retry' && attempts >= campaign.maxAttempts) status = 'completed'

    const stamp = new Date()
    const combinedNotes = notes
      ? [lead.notes, `[${stamp.toISOString().slice(0, 16).replace('T', ' ')}] ${disposition.label}: ${notes}`]
          .filter(Boolean)
          .join('\n')
          .slice(-4000)
      : lead.notes

    const [updated] = await db
      .update(leads)
      .set({
        status,
        disposition: disposition.id,
        attempts,
        lastCalledAt: stamp,
        callbackAt,
        notes: combinedNotes,
      })
      .where(and(eq(leads.id, lead.id), eq(leads.userId, user.id)))
      .returning()

    if (body.callId) {
      await db
        .update(calls)
        .set({ disposition: disposition.id, notes })
        .where(and(eq(calls.id, Number(body.callId)), eq(calls.userId, user.id), eq(calls.leadId, lead.id)))
    } else {
      await db.insert(calls).values({
        userId: user.id,
        campaignId: campaign.id,
        leadId: lead.id,
        phone: lead.phone,
        status: 'Manual',
        disposition: disposition.id,
        notes,
        endedAt: stamp,
        durationSec: 0,
      })
    }

    const synced = await writeLeadToSheet(user.id, campaign, updated)
    return NextResponse.json({ lead: updated, synced })
  } catch (error) {
    return handleApiError(error)
  }
}
