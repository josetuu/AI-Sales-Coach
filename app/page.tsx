import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { calls, rcLink } from "@/lib/db/schema"
import { CoachApp } from "@/components/coach-app"

export const maxDuration = 300

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const userId = session.user.id

  const [[link], rows] = await Promise.all([
    db.select().from(rcLink).where(eq(rcLink.userId, userId)),
    db.select().from(calls).where(eq(calls.userId, userId)).orderBy(desc(calls.startedAt)).limit(100),
  ])

  return <CoachApp userName={session.user.name} link={link ?? null} calls={rows} />
}
