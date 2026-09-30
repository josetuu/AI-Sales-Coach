'use client'

import useSWR from 'swr'
import { ArrowUpRight, FileSpreadsheet, Headphones, Plus } from 'lucide-react'
import { fetcher, formatDateTime } from '@/lib/api-client'
import type { CampaignDTO } from '@/lib/types'
import { LinkButton } from '@/components/link-button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressBar } from '@/components/progress-bar'

export function CampaignList() {
  const { data, isLoading, error } = useSWR<{ campaigns: CampaignDTO[] }>('/api/campaigns', fetcher)

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-destructive">{error.message}</p>

  if (!data?.campaigns.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
          <FileSpreadsheet className="size-5" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Aún no tienes campañas</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Elige una hoja de Google Sheets con tus leads, mapea las columnas y empieza a marcar.
          </p>
        </div>
        <LinkButton href="/campaigns/new">
          <Plus className="size-4" aria-hidden />
          Crear primera campaña
        </LinkButton>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.campaigns.map((c) => {
        const s = c.stats
        const total = s?.total ?? 0
        const done = (s?.completed ?? 0) + (s?.dnc ?? 0)
        return (
          <article key={c.id} className="flex flex-col gap-5 rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">{c.name}</h3>
                <p className="truncate text-sm text-muted-foreground">
                  {c.spreadsheetTitle} · {c.sheetName}
                </p>
              </div>
              <LinkButton variant="ghost" size="icon" href={`/campaigns/${c.id}`} aria-label={`Ver ${c.name}`}>
                <ArrowUpRight className="size-4" />
              </LinkButton>
            </div>
            <ProgressBar total={total} done={done} />
            <dl className="grid grid-cols-4 gap-2 text-sm">
              <Metric label="Leads" value={total} />
              <Metric label="Pendientes" value={(s?.new ?? 0) + (s?.retry ?? 0)} />
              <Metric label="Callbacks" value={s?.callback ?? 0} highlight={(s?.callbackDue ?? 0) > 0} />
              <Metric label="Positivos" value={s?.positive ?? 0} />
            </dl>
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">Sincronizado {formatDateTime(c.lastSyncedAt)}</p>
              <LinkButton size="sm" href={`/campaigns/${c.id}/dialer`}>
                <Headphones className="size-4" aria-hidden />
                Abrir dialer
              </LinkButton>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-mono text-lg tabular-nums ${highlight ? 'text-warning' : ''}`}>{value}</dd>
    </div>
  )
}
