import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { calls, rcLink } from "@/lib/db/schema"
import { downloadRecording, listRecordedCalls } from "@/lib/ringcentral"
import { analyzeTranscript, transcribeRecording } from "@/lib/ai"

const MIN_SECONDS = 20

export async function importCalls(userId: string, extensionId: string) {
  const records = await listRecordedCalls(extensionId)
  const rows = records
    .filter((r) => r.recording && r.duration >= MIN_SECONDS)
    .map((r) => ({
      userId,
      rcCallId: r.id,
      recordingId: r.recording!.contentUri,
      direction: r.direction,
      fromNumber: r.from?.phoneNumber ?? null,
      fromName: r.from?.name ?? null,
      toNumber: r.to?.phoneNumber ?? null,
      toName: r.to?.name ?? null,
      startedAt: new Date(r.startTime),
      duration: r.duration,
    }))
  if (rows.length) await db.insert(calls).values(rows).onConflictDoNothing({ target: calls.rcCallId })
  return rows.length
}

async function processCall(id: number) {
  const [claimed] = await db
    .update(calls)
    .set({ status: "processing", error: null })
    .where(and(eq(calls.id, id), inArray(calls.status, ["pending", "error"])))
    .returning()
  if (!claimed?.recordingId) return
  try {
    const audio = await downloadRecording(claimed.recordingId)
    const transcript = claimed.transcript?.length
      ? claimed.transcript
      : await transcribeRecording(audio.data, audio.mediaType)
    await db.update(calls).set({ transcript }).where(eq(calls.id, id))
    const report = await analyzeTranscript(transcript)
    await db
      .update(calls)
      .set({ report, score: Math.round(report.score), status: "done" })
      .where(eq(calls.id, id))
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    await db
      .update(calls)
      .set({ status: "error", error: msg.includes("quota") || msg.includes("429") ? "Límite gratuito de Gemini alcanzado. Reinténtalo más tarde." : msg })
      .where(eq(calls.id, id))
  }
}

export async function processPending(userId: string, limit = 3) {
  const pending = await db
    .select({ id: calls.id })
    .from(calls)
    .where(and(eq(calls.userId, userId), eq(calls.status, "pending")))
    .orderBy(calls.startedAt)
    .limit(limit)
  for (const c of pending) await processCall(c.id)
}

export async function retryCall(userId: string, id: number) {
  const [row] = await db.select({ id: calls.id }).from(calls).where(and(eq(calls.id, id), eq(calls.userId, userId)))
  if (row) await processCall(row.id)
}

export async function syncByExtension(extensionId: string) {
  const [link] = await db.select().from(rcLink).where(eq(rcLink.extensionId, extensionId))
  if (!link) return
  await importCalls(link.userId, extensionId)
  await processPending(link.userId)
}
