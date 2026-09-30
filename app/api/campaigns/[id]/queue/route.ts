import { NextResponse, type NextRequest } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { getCampaign, getLeadCalls, getNextLead, getUpcomingQueue } from '@/lib/campaigns'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await apiUser()
    const campaign = await getCampaign(user.id, Number((await params).id))
    const skip = (request.nextUrl.searchParams.get('skip') ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 200)
    const [next, upcoming] = await Promise.all([
      getNextLead(user.id, campaign, skip),
      getUpcomingQueue(user.id, campaign),
    ])
    const history = next.lead ? await getLeadCalls(user.id, next.lead.id) : []
    return NextResponse.json({
      current: next.lead,
      reason: next.reason,
      history,
      upcoming: upcoming.filter((l) => l.id !== next.lead?.id && !skip.includes(l.id)),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
