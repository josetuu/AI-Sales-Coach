import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { calls } from '@/lib/db/schema'
import { apiUser, handleApiError, HttpError } from '@/lib/session'
import { cancelRingOut, getRingOut } from '@/lib/ringcentral'

type Ctx = { params: Promise<{ id: string }> }

async function loadCall(userId: string, id: number) {
  const [call] = await db.select().from(calls).where(and(eq(calls.id, id), eq(calls.userId, userId)))
  if (!call) throw new HttpError(404, 'Llamada no encontrada')
  return call
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await apiUser()
    const call = await loadCall(user.id, Number((await params).id))
    if (!call.ringoutId || call.endedAt) return NextResponse.json({ call, ringStatus: null, ended: true })
    try {
      const ringout = await getRingOut(user.id, call.ringoutId)
      const ended = ringout.status.callStatus !== 'InProgress'
      if (ringout.status.callStatus !== call.status || ended) {
        await db
          .update(calls)
          .set({
            status: ringout.status.callStatus,
            ...(ended
              ? {
                  endedAt: new Date(),
                  durationSec: Math.round((Date.now() - call.startedAt.getTime()) / 1000),
                }
              : {}),
          })
          .where(and(eq(calls.id, call.id), eq(calls.userId, user.id)))
      }
      return NextResponse.json({ call, ringStatus: ringout.status, ended })
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        await db
          .update(calls)
          .set({ endedAt: new Date(), durationSec: Math.round((Date.now() - call.startedAt.getTime()) / 1000) })
          .where(and(eq(calls.id, call.id), eq(calls.userId, user.id)))
        return NextResponse.json({ call, ringStatus: null, ended: true })
      }
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}

const FINAL_STATUSES = new Set(['Success', 'NoAnsweredCall', 'Busy', 'CannotReach', 'Error', 'Cancelled'])

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const user = await apiUser()
    const call = await loadCall(user.id, Number((await params).id))
    const body = (await req.json().catch(() => ({}))) as { status?: string }
    const finalStatus = body.status && FINAL_STATUSES.has(body.status) ? body.status : 'Cancelled'
    if (call.ringoutId && !call.endedAt) {
      await cancelRingOut(user.id, call.ringoutId).catch((e) => {
        if (!(e instanceof HttpError && e.status === 404)) throw e
      })
    }
    await db
      .update(calls)
      .set({
        status: call.endedAt ? call.status : finalStatus,
        endedAt: call.endedAt ?? new Date(),
        durationSec: call.durationSec ?? Math.round((Date.now() - call.startedAt.getTime()) / 1000),
      })
      .where(and(eq(calls.id, call.id), eq(calls.userId, user.id)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
