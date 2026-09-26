import { after } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { webhookVerificationToken } from "@/lib/ringcentral"
import { syncByExtension } from "@/lib/process-calls"

export const maxDuration = 300

type Party = { extensionId?: string; status?: { code?: string } }

function tokenMatches(received: string | null) {
  const expected = Buffer.from(webhookVerificationToken())
  const got = Buffer.from(received ?? "")
  return got.length === expected.length && timingSafeEqual(got, expected)
}

export async function POST(req: Request) {
  const validation = req.headers.get("validation-token")
  if (validation) return new Response(null, { status: 200, headers: { "Validation-Token": validation } })

  if (!tokenMatches(req.headers.get("verification-token"))) return new Response(null, { status: 401 })

  const event = await req.json().catch(() => null)
  const parties: Party[] = event?.body?.parties ?? []
  const ended = parties.find((p) => p.extensionId && p.status?.code === "Disconnected")
  if (ended?.extensionId) {
    const extensionId = String(ended.extensionId)
    after(async () => {
      // RingCentral needs a short delay before the recording shows up in the call log.
      await new Promise((r) => setTimeout(r, 45_000))
      await syncByExtension(extensionId)
    })
  }
  return new Response(null, { status: 200 })
}
