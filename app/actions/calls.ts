"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rcLink } from "@/lib/db/schema"
import { listExtensions, subscribeToCalls, type Extension } from "@/lib/ringcentral"
import { importCalls, processPending, retryCall } from "@/lib/process-calls"

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string }

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof Error ? e.message : "Error inesperado",
})

export async function getExtensions(): Promise<Result<Extension[]>> {
  try {
    await getUserId()
    return { ok: true, data: await listExtensions() }
  } catch (e) {
    return fail(e)
  }
}

export async function linkExtension(ext: Extension): Promise<Result> {
  try {
    const userId = await getUserId()
    const valid = (await listExtensions()).find((x) => x.id === ext.id)
    if (!valid) return { ok: false, error: "Extensión no encontrada" }
    const [taken] = await db.select().from(rcLink).where(eq(rcLink.extensionId, valid.id))
    if (taken && taken.userId !== userId) return { ok: false, error: "Esa extensión ya está vinculada a otro usuario" }
    await db
      .insert(rcLink)
      .values({ userId, extensionId: valid.id, extensionNumber: valid.extensionNumber, extensionName: valid.name })
      .onConflictDoUpdate({
        target: rcLink.userId,
        set: { extensionId: valid.id, extensionNumber: valid.extensionNumber, extensionName: valid.name },
      })
    revalidatePath("/")
    return { ok: true, data: null }
  } catch (e) {
    return fail(e)
  }
}

async function getLink(userId: string) {
  const [link] = await db.select().from(rcLink).where(eq(rcLink.userId, userId))
  if (!link) throw new Error("Primero vincula tu extensión de RingCentral")
  return link
}

export async function syncCalls(): Promise<Result<number>> {
  try {
    const userId = await getUserId()
    const link = await getLink(userId)
    const found = await importCalls(userId, link.extensionId)
    after(() => processPending(userId, 5))
    revalidatePath("/")
    return { ok: true, data: found }
  } catch (e) {
    return fail(e)
  }
}

export async function retry(id: number): Promise<Result> {
  try {
    const userId = await getUserId()
    after(() => retryCall(userId, id))
    return { ok: true, data: null }
  } catch (e) {
    return fail(e)
  }
}

export async function enableAutoSync(): Promise<Result> {
  try {
    const userId = await getUserId()
    const link = await getLink(userId)
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.V0_RUNTIME_URL
    if (!host) return { ok: false, error: "Publica la app para activar la sincronización automática" }
    await subscribeToCalls(link.extensionId, `${host}/api/ringcentral/webhook`)
    return { ok: true, data: null }
  } catch (e) {
    return fail(e)
  }
}
