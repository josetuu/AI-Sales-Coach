'use client'

import type { CampaignStats, LeadDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const DOT: Record<string, string> = {
  callback: 'bg-warning',
  new: 'bg-chart-3',
  retry: 'bg-muted-foreground/60',
}

export function DialerQueue({
  current,
  upcoming,
  stats,
  skippedCount,
  onResetSkips,
}: {
  current: LeadDTO | null
  upcoming: LeadDTO[]
  stats: CampaignStats | null
  skippedCount: number
  onResetSkips: () => void
}) {
  return (
    <aside aria-label="Cola de llamadas" className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:max-h-[calc(100dvh-7rem)]">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Counter label="Nuevos" value={stats?.new ?? 0} />
        <Counter label="Callbacks" value={stats?.callbackDue ?? 0} tone="warning" />
        <Counter label="Reintentos" value={stats?.retry ?? 0} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Siguientes</h2>
        {skippedCount > 0 && (
          <Button size="xs" variant="ghost" onClick={onResetSkips}>
            {skippedCount} saltados · recuperar
          </Button>
        )}
      </div>

      <ol className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1">
        {current && <QueueItem lead={current} active />}
        {upcoming.map((l) => (
          <QueueItem key={l.id} lead={l} />
        ))}
        {!current && !upcoming.length && <li className="py-6 text-center text-sm text-muted-foreground">Sin leads</li>}
      </ol>
    </aside>
  )
}

function QueueItem({ lead, active }: { lead: LeadDTO; active?: boolean }) {
  return (
    <li
      aria-current={active ? 'true' : undefined}
      className={cn('flex items-center gap-3 rounded-lg px-3 py-2', active ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-accent/50')}
    >
      <span className={cn('size-2 shrink-0 rounded-full', DOT[lead.status] ?? 'bg-muted')} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', active && 'font-medium')}>{lead.name ?? 'Sin nombre'}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{lead.phone}</p>
      </div>
      {lead.attempts > 0 && <span className="font-mono text-xs text-muted-foreground">×{lead.attempts}</span>}
    </li>
  )
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: 'warning' }) {
  return (
    <div className="rounded-lg bg-secondary/60 px-2 py-2">
      <p className={cn('font-mono text-lg tabular-nums', tone === 'warning' && value > 0 && 'text-warning')}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
