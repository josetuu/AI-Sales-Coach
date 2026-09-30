import { NextResponse } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { startGoogleAuthorization } from '@/lib/google'

export async function POST() {
  try {
    const user = await apiUser()
    const url = await startGoogleAuthorization(user.id)
    return NextResponse.json({ url })
  } catch (error) {
    return handleApiError(error)
  }
}
