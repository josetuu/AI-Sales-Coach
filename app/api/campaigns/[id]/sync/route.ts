import { NextResponse } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { getCampaign, syncCampaign } from '@/lib/campaigns'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await apiUser()
    const campaign = await getCampaign(user.id, Number((await params).id))
    const result = await syncCampaign(user.id, campaign)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
