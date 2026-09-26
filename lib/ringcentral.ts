import "server-only"
import { createHash } from "node:crypto"

const SERVER = "https://platform.ringcentral.com"

let cached: { token: string; expires: number } | null = null

async function getToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const basic = Buffer.from(`${process.env.RINGCENTRAL_CLIENT_ID}:${process.env.RINGCENTRAL_CLIENT_SECRET}`).toString("base64")
  const res = await fetch(`${SERVER}/restapi/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: process.env.RINGCENTRAL_JWT ?? "",
    }),
    cache: "no-store",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`RingCentral rechazó las credenciales: ${data.error_description ?? res.status}`)
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 }
  return cached.token
}

async function rc(path: string, init?: RequestInit) {
  const res = await fetch(path.startsWith("http") ? path : `${SERVER}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${await getToken()}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (body.permissionName) {
      throw new Error(`Falta el permiso "${body.permissionName}" en tu app de RingCentral (developers.ringcentral.com).`)
    }
    throw new Error(body.message ?? `Error de RingCentral (${res.status})`)
  }
  return res
}

export type Extension = { id: string; extensionNumber: string; name: string }

export async function listExtensions(): Promise<Extension[]> {
  const res = await rc("/restapi/v1.0/account/~/extension?type=User&status=Enabled&perPage=500")
  const data = await res.json()
  return data.records.map((r: { id: number; extensionNumber: string; name: string }) => ({
    id: String(r.id),
    extensionNumber: r.extensionNumber,
    name: r.name,
  }))
}

export type RcCall = {
  id: string
  startTime: string
  duration: number
  direction: string
  from?: { phoneNumber?: string; name?: string }
  to?: { phoneNumber?: string; name?: string }
  recording?: { id: string; contentUri: string }
}

export async function listRecordedCalls(extensionId: string, days = 7): Promise<RcCall[]> {
  const dateFrom = new Date(Date.now() - days * 86_400_000).toISOString()
  const q = new URLSearchParams({ type: "Voice", withRecording: "true", view: "Simple", perPage: "100", dateFrom })
  const res = await rc(`/restapi/v1.0/account/~/extension/${extensionId}/call-log?${q}`)
  const data = await res.json()
  return data.records
}

export async function downloadRecording(contentUri: string) {
  const res = await rc(contentUri)
  return {
    data: new Uint8Array(await res.arrayBuffer()),
    mediaType: res.headers.get("content-type")?.split(";")[0] || "audio/mpeg",
  }
}

export const webhookVerificationToken = () =>
  createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET}:rc-webhook`).digest("hex").slice(0, 32)

export async function subscribeToCalls(extensionId: string, address: string) {
  await rc("/restapi/v1.0/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventFilters: [`/restapi/v1.0/account/~/extension/${extensionId}/telephony/sessions`],
      deliveryMode: { transportType: "WebHook", address, verificationToken: webhookVerificationToken() },
      expiresIn: 630720000,
    }),
  })
}
