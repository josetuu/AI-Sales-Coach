import { NextResponse } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { startRingCentralAuthorization } from '@/lib/ringcentral'

export async function POST() {
  try {
    const user = await apiUser()
    const url = await startRingCentralAuthorization(user.id)
    return NextResponse.json({ url })
  } catch (error) {
    return handleApiError(error)
  }
}
