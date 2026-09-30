import 'server-only'
import { getToken, startAuthorization, UserAuthorizationRequiredError, NoValidTokenError } from '@vercel/connect'
import { headers } from 'next/headers'
import { HttpError } from '@/lib/session'

const GOOGLE_CONNECTOR_UID = 'google/dialer-google-sheets'
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
]

function subject(userId: string) {
  return { type: 'user' as const, id: userId }
}

export async function getOrigin(): Promise<string> {
  if (process.env.NODE_ENV !== 'production' && process.env.V0_RUNTIME_URL)
    return process.env.V0_RUNTIME_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  return `${h.get('x-forwarded-proto') ?? 'https'}://${host}`
}

async function googleToken(userId: string) {
  try {
    return await getToken(GOOGLE_CONNECTOR_UID, { subject: subject(userId), scopes: GOOGLE_SCOPES })
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError || error instanceof NoValidTokenError) {
      throw new HttpError(403, 'Conecta tu cuenta de Google para continuar', 'GOOGLE_AUTH_REQUIRED')
    }
    throw error
  }
}

export async function isGoogleConnected(userId: string) {
  try {
    await googleToken(userId)
    return true
  } catch (error) {
    if (error instanceof HttpError && error.code === 'GOOGLE_AUTH_REQUIRED') return false
    throw error
  }
}

export async function startGoogleAuthorization(userId: string) {
  const origin = await getOrigin()
  const { url } = await startAuthorization(
    GOOGLE_CONNECTOR_UID,
    { subject: subject(userId), scopes: GOOGLE_SCOPES },
    { callbackUrl: `${origin}/dashboard?google=connected` },
  )
  return url
}

async function googleFetch<T>(userId: string, url: string, init?: RequestInit): Promise<T> {
  const token = await googleToken(userId)
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('[google] request failed', res.status, body.slice(0, 300))
    if (res.status === 401) throw new HttpError(403, 'La sesión de Google expiró', 'GOOGLE_AUTH_REQUIRED')
    if (res.status === 403 || res.status === 404)
      throw new HttpError(res.status, 'No se pudo acceder a la hoja. Verifica permisos y URL.')
    throw new HttpError(502, 'Error al comunicarse con Google Sheets')
  }
  return res.json() as Promise<T>
}

export async function listSpreadsheets(userId: string) {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false")
  const data = await googleFetch<{ files: { id: string; name: string; modifiedTime: string }[] }>(
    userId,
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime)`,
  )
  return data.files
}

export async function getSpreadsheetMeta(userId: string, spreadsheetId: string) {
  const data = await googleFetch<{
    properties: { title: string }
    sheets: { properties: { title: string; gridProperties: { rowCount: number } } }[]
  }>(
    userId,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties`,
  )
  return {
    title: data.properties.title,
    sheets: data.sheets.map((s) => s.properties.title),
  }
}

function sheetRange(sheetName: string, range: string) {
  return encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!${range}`)
}

export async function readSheet(userId: string, spreadsheetId: string, sheetName: string) {
  const data = await googleFetch<{ values?: string[][] }>(
    userId,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${sheetRange(sheetName, 'A1:ZZ5000')}`,
  )
  return data.values ?? []
}

export function columnLetter(index: number) {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export async function writeHeaders(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
) {
  await googleFetch(
    userId,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${sheetRange(sheetName, `A1:${columnLetter(headers.length - 1)}1`)}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: [headers] }) },
  )
}

export async function writeCells(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  cells: { row: number; col: number; value: string }[],
) {
  if (cells.length === 0) return
  await googleFetch(
    userId,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: cells.map((c) => ({
          range: `'${sheetName.replace(/'/g, "''")}'!${columnLetter(c.col)}${c.row}`,
          values: [[c.value]],
        })),
      }),
    },
  )
}

export function parseSpreadsheetId(input: string) {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (match) return match[1]
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim()
  return null
}
