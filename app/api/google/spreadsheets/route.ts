import { NextResponse } from 'next/server'
import { apiUser, handleApiError } from '@/lib/session'
import { listSpreadsheets } from '@/lib/google'

export async function GET() {
  try {
    const user = await apiUser()
    const files = await listSpreadsheets(user.id)
    return NextResponse.json({ files })
  } catch (error) {
    return handleApiError(error)
  }
}
