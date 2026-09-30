import 'server-only'
import { getToken, startAuthorization, UserAuthorizationRequiredError, NoValidTokenError } from '@vercel/connect'
import { HttpError } from '@/lib/session'
import { getOrigin } from '@/lib/google'

const RINGCENTRAL_CONNECTOR_UID = 'platform.ringcentral.com/dialer-ringcentral'
const RC_BASE = 'https://platform.ringcentral.com/restapi/v1.0'
const RC_SCOPES = ['RingOut', 'ReadAccounts', 'VoipCalling']

function subject(userId: string) {
  return { type: 'user' as const, id: userId }
}

async function rcToken(userId: string) {
  try {
    return await getToken(RINGCENTRAL_CONNECTOR_UID, { subject: subject(userId), scopes: RC_SCOPES })
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError || error instanceof NoValidTokenError) {
      throw new HttpError(403, 'Conecta tu cuenta de RingCentral para continuar', 'RC_AUTH_REQUIRED')
    }
    console.error('[ringcentral] token error', error instanceof Error ? error.message : error)
    throw new HttpError(503, 'RingCentral no está disponible. Revisa el conector.', 'RC_UNAVAILABLE')
  }
}

export async function startRingCentralAuthorization(userId: string) {
  const origin = await getOrigin()
  const { url } = await startAuthorization(
    RINGCENTRAL_CONNECTOR_UID,
    { subject: subject(userId), scopes: RC_SCOPES },
    { callbackUrl: `${origin}/dashboard?ringcentral=connected` },
  )
  return url
}

async function rcFetch<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  const token = await rcToken(userId)
  const res = await fetch(`${RC_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const body = await res.text()
    console.error('[ringcentral] request failed', res.status, body.slice(0, 300))
    if (res.status === 401) throw new HttpError(403, 'La sesión de RingCentral expiró', 'RC_AUTH_REQUIRED')
    if (res.status === 404) throw new HttpError(404, 'La llamada ya no existe en RingCentral')
    throw new HttpError(502, 'RingCentral rechazó la solicitud. Verifica los números.')
  }
  return res.json() as Promise<T>
}

export type RingOutStatus = {
  id: string
  status: {
    callStatus: string
    callerStatus?: string
    calleeStatus?: string
  }
}

export function normalizePhone(raw: string) {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return null
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  return `+${digits}`
}

export async function getRingCentralProfile(userId: string) {
  const [ext, numbers] = await Promise.all([
    rcFetch<{ name: string; extensionNumber: string }>(userId, '/account/~/extension/~'),
    rcFetch<{ records: { phoneNumber: string; usageType: string; features?: string[] }[] }>(
      userId,
      '/account/~/extension/~/phone-number?perPage=100',
    ),
  ])
  return {
    name: ext.name,
    extension: ext.extensionNumber,
    phoneNumbers: numbers.records.map((r) => ({
      phoneNumber: r.phoneNumber,
      usageType: r.usageType,
      callerId: r.features?.includes('CallerId') ?? false,
    })),
  }
}

export async function provisionSip(userId: string) {
  try {
    const res = await rcFetch<{ sipInfo: Record<string, unknown>[] }>(userId, '/client-info/sip-provision', {
      method: 'POST',
      body: JSON.stringify({ sipInfo: [{ transport: 'WSS' }] }),
    })
    const sipInfo = res.sipInfo?.[0]
    if (!sipInfo) throw new HttpError(502, 'RingCentral no devolvió datos del teléfono web')
    return sipInfo
  } catch (error) {
    if (error instanceof HttpError && error.status === 502) {
      throw new HttpError(
        502,
        'RingCentral no permitió activar el teléfono web. Agrega el permiso "VoIP Calling" a tu app de RingCentral y vuelve a conectar.',
        'RC_WEBPHONE_DENIED',
      )
    }
    throw error
  }
}

export async function startRingOut(userId: string, from: string, to: string) {
  return rcFetch<RingOutStatus>(userId, '/account/~/extension/~/ring-out', {
    method: 'POST',
    body: JSON.stringify({
      from: { phoneNumber: from },
      to: { phoneNumber: to },
      playPrompt: false,
    }),
  })
}

export async function getRingOut(userId: string, id: string) {
  return rcFetch<RingOutStatus>(userId, `/account/~/extension/~/ring-out/${encodeURIComponent(id)}`)
}

export async function cancelRingOut(userId: string, id: string) {
  return rcFetch<void>(userId, `/account/~/extension/~/ring-out/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
