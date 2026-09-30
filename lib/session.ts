import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')
  return user
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

export async function apiUser() {
  const user = await getSessionUser()
  if (!user) throw new HttpError(401, 'No autenticado')
  return user
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error('[api] unexpected error', error)
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}
