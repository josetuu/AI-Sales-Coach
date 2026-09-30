'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, Plus } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'

const NAV = [
  { href: '/dashboard', label: 'Campañas', icon: LayoutDashboard },
  { href: '/campaigns/new', label: 'Nueva campaña', icon: Plus },
]

export function AppSidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" aria-label="Inicio">
          <BrandMark />
        </Link>
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                active && 'bg-sidebar-accent text-foreground',
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="flex items-center gap-3 border-t p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar sesión"
          onClick={async () => {
            await signOut()
            router.push('/sign-in')
            router.refresh()
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </aside>
  )
}
