import { NextResponse, type NextRequest } from 'next/server'
import { and, asc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { apiUser, handleApiError } from '@/lib/session'
import { getCampaign } from '@/lib/campaigns'

const STATUSES = ['new', 'callback', 'retry', 'completed', 'dnc']

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await apiUser()
    const campaign = await getCampaign(user.id, Number((await params).id))
    const status = request.nextUrl.searchParams.get('status')
    const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 100)
    const rows = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.userId, user.id),
          eq(leads.campaignId, campaign.id),
          status && STATUSES.includes(status) ? eq(leads.status, status) : undefined,
          q
            ? or(
                ilike(leads.name, `%${q}%`),
                ilike(leads.phone, `%${q}%`),
                ilike(leads.company, `%${q}%`),
                ilike(leads.email, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(asc(leads.rowNumber))
      .limit(500)
    return NextResponse.json({ leads: rows })
  } catch (error) {
    return handleApiError(error)
  }
}
