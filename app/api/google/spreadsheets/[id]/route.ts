import { NextResponse, type NextRequest } from 'next/server'
import { apiUser, handleApiError, HttpError } from '@/lib/session'
import { getSpreadsheetMeta, parseSpreadsheetId, readSheet } from '@/lib/google'
import { guessColumnMap } from '@/lib/campaigns'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await apiUser()
    const { id } = await params
    const spreadsheetId = parseSpreadsheetId(decodeURIComponent(id))
    if (!spreadsheetId) throw new HttpError(400, 'URL o ID de hoja inválido')

    const meta = await getSpreadsheetMeta(user.id, spreadsheetId)
    const sheet = request.nextUrl.searchParams.get('sheet') ?? meta.sheets[0]
    if (!sheet || !meta.sheets.includes(sheet)) throw new HttpError(400, 'Pestaña no encontrada')

    const values = await readSheet(user.id, spreadsheetId, sheet)
    const [headers = [], ...rows] = values
    return NextResponse.json({
      spreadsheetId,
      title: meta.title,
      sheets: meta.sheets,
      sheet,
      headers: headers.map(String),
      sample: rows.slice(0, 5),
      rowCount: rows.length,
      guess: guessColumnMap(headers.map(String)),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
