import { AppSidebar } from '@/components/app-sidebar'
import { requireUser } from '@/lib/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div className="flex min-h-dvh">
      <AppSidebar user={{ name: user.name, email: user.email }} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
