import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calls, leads } from '@/lib/db/schema'
import { apiUser, handleApiError, HttpError } from '@/lib/session'
import { getCampaign } from '@/lib/campaigns'
import { normalizePhone, startRingOut } from '@/lib/ringcentral'

export async function POST(request: Request) {
  try {
    const user = await apiUser()
    const { leadId, mode } = (await request.json()) as { leadId?: number; mode?: 'browser' | 'phone' }
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, Number(leadId)), eq(leads.userId, user.id)))
    if (!lead) throw new HttpError(404, 'Lead no encontrado')
    if (lead.status === 'dnc') throw new HttpError(400, 'Este lead está marcado como No llamar')

    const campaign = await getCampaign(user.id, lead.campaignId)
    const to = lead.phone ? normalizePhone(lead.phone) : null
    if (!to) throw new HttpError(400, 'El lead no tiene un teléfono válido')

    if (mode === 'browser') {
      const [call] = await db
        .insert(calls)
        .values({ userId: user.id, campaignId: campaign.id, leadId: lead.id, phone: to, status: 'InProgress' })
        .returning()
      return NextResponse.json({ call, to })
    }

    if (!campaign.agentPhone)
      throw new HttpError(400, 'Configura tu número de agente en los ajustes de la campaña', 'NO_AGENT_PHONE')

    const ringout = await startRingOut(user.id, campaign.agentPhone, to)
    const [call] = await db
      .insert(calls)
      .values({
        userId: user.id,
        campaignId: campaign.id,
        leadId: lead.id,
        ringoutId: ringout.id,
        phone: to,
        status: ringout.status.callStatus,
      })
      .returning()
    return NextResponse.json({ call, ringStatus: ringout.status })
  } catch (error) {
    return handleApiError(error)
  }
}
