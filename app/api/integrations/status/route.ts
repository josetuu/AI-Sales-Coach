import { NextResponse } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { isGoogleConnected } from '@/lib/google'
import { getRingCentralProfile } from '@/lib/ringcentral'

export async function GET() {
  try {
    const user = await apiUser()
    const [google, ringcentral] = await Promise.all([
      isGoogleConnected(user.id).catch(() => false),
      getRingCentralProfile(user.id)
        .then((profile) => ({ connected: true as const, profile }))
        .catch(() => ({ connected: false as const, profile: null })),
    ])
    return NextResponse.json({ google, ringcentral })
  } catch (error) {
    return handleApiError(error)
  }
}
