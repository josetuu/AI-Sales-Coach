import { NextResponse } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { provisionSip } from '@/lib/ringcentral'

export async function POST() {
  try {
    const user = await apiUser()
    const sipInfo = await provisionSip(user.id)
    return NextResponse.json({ sipInfo }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleApiError(error)
  }
}
