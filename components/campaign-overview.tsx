'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ChevronLeft, ExternalLink, Headphones, Loader2, RefreshCw, Search } from 'lucide-react'
import { apiSend, fetcher, formatDateTime, formatDuration } from '@/lib/api-client'
import type { CampaignDTO, CampaignStats, LeadDTO } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/dispositions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-header'
import { LinkButton } from '@/components/link-button'
import { ProgressBar } from '@/components/progress-bar'
import { DispositionLabel, StatusBadge } from '@/components/status-badge'
import { CampaignSettingsDialog } from '@/components/campaign-settings-dialog'

type Overview = {
  campaign: CampaignDTO
  stats: CampaignStats | null
  callSummary: { totalCalls: number; today: number; talkSeconds: number; avgSeconds: number }
  callbacks: LeadDTO[]
  recentCalls: {
    id: number
    status: string
    disposition: string | null
    startedAt: string
    durationSec: number | null
    notes: string | null
    leadName: string | null
    leadPhone: string | null
  }[]
}

export function CampaignOverview({ campaignId }: { campaignId: number }) {
  const { data, isLoading, error, mutate } = useSWR<Overview>(`/api/campaigns/${campaignId}`, fetcher)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  async function sync() {
    setSyncing(true)
    try {
      const res = await apiSend<{ imported: number }>(`/api/campaigns/${campaignId}/sync`, 'POST')
      toast.success(`Sincronizado: ${res.imported} leads`)
      await mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  if (error) {
    return (
      <main className="px-6 py-10 lg:px-10">
        <p className="text-destructive">{error.message}</p>
      </main>
    )
  }
  if (isLoading || !data) {
    return (
      <main className="flex flex-col gap-6 px-6 py-10 lg:px-10">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </main>
    )
  }

  const { campaign, stats, callSummary } = data
  const total = stats?.total ?? 0
  const done = (stats?.completed ?? 0) + (stats?.dnc ?? 0)
  const contactRate = stats?.contacted ? Math.round((stats.positive / stats.contacted) * 100) : 0

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/dashboard" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3.5" aria-hidden />
            Campañas
          </Link>
        }
        title={campaign.name}
        description={
          <a
            href={`https://docs.google.com/spreadsheets/d/${campaign.spreadsheetId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            {campaign.spreadsheetTitle} · {campaign.sheetName}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        }
        actions={
          <>
            <Button variant="outline" onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
              Sincronizar
            </Button>
            <CampaignSettingsDialog
              campaign={campaign}
              onSaved={() => mutate()}
              onDeleted={() => router.push('/dashboard')}
            />
            <LinkButton href={`/campaigns/${campaign.id}/dialer`}>
              <Headphones className="size-4" aria-hidden />
              Iniciar dialer
            </LinkButton>
          </>
        }
      />
      <main className="flex flex-col gap-8 px-6 py-8 lg:px-10">
        <section aria-label="Métricas" className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Leads totales" value={total} />
          <Kpi label="Contactados" value={stats?.contacted ?? 0} />
          <Kpi label="Positivos" value={stats?.positive ?? 0} sub={`${contactRate}% de contactados`} tone="success" />
          <Kpi label="Callbacks vencidos" value={stats?.callbackDue ?? 0} sub={`${stats?.callback ?? 0} agendados`} tone="warning" />
          <Kpi label="Llamadas hoy" value={callSummary.today} sub={`${callSummary.totalCalls} en total`} />
          <Kpi label="Tiempo en llamada" value={formatDuration(callSummary.talkSeconds)} sub={`Prom. ${formatDuration(callSummary.avgSeconds)}`} />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <ProgressBar total={total} done={done} />
          <StatusBreakdown stats={stats} />
        </section>

        <Tabs defaultValue="leads" className="gap-4">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="callbacks">Callbacks ({data.callbacks.length})</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="leads">
            <LeadsTable campaignId={campaign.id} />
          </TabsContent>
          <TabsContent value="callbacks">
            <SimpleTable
              empty="No hay callbacks agendados"
              headers={['Lead', 'Teléfono', 'Programado', 'Notas']}
              rows={data.callbacks.map((l) => [
                <LeadName key="n" lead={l} />,
                <span key="p" className="font-mono">{l.phone}</span>,
                <span key="c" className={cn(l.callbackAt && new Date(l.callbackAt) <= new Date() && 'text-warning')}>
                  {formatDateTime(l.callbackAt)}
                </span>,
                <span key="no" className="line-clamp-1 text-muted-foreground">{lastNote(l.notes)}</span>,
              ])}
            />
          </TabsContent>
          <TabsContent value="history">
            <SimpleTable
              empty="Aún no hay llamadas"
              headers={['Fecha', 'Lead', 'Resultado', 'Duración', 'Notas']}
              rows={data.recentCalls.map((c) => [
                <span key="d" className="text-muted-foreground">{formatDateTime(c.startedAt)}</span>,
                <div key="l">
                  <p>{c.leadName ?? 'Sin nombre'}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.leadPhone}</p>
                </div>,
                <DispositionLabel key="r" disposition={c.disposition} />,
                <span key="t" className="font-mono tabular-nums">{formatDuration(c.durationSec ?? 0)}</span>,
                <span key="n" className="line-clamp-1 text-muted-foreground">{c.notes ?? ''}</span>,
              ])}
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}

function lastNote(notes: string | null) {
  return notes?.split('\n').at(-1) ?? ''
}

function Kpi({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: 'success' | 'warning' }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'font-mono text-2xl font-medium tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function StatusBreakdown({ stats }: { stats: CampaignStats | null }) {
  const items = [
    { key: 'new', value: stats?.new ?? 0, color: 'bg-chart-3' },
    { key: 'callback', value: stats?.callback ?? 0, color: 'bg-warning' },
    { key: 'retry', value: stats?.retry ?? 0, color: 'bg-chart-5' },
    { key: 'completed', value: stats?.completed ?? 0, color: 'bg-success' },
    { key: 'dnc', value: stats?.dnc ?? 0, color: 'bg-destructive' },
  ] as const
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', i.color)} aria-hidden />
          <span className="text-muted-foreground">{STATUS_LABELS[i.key]}</span>
          <span className="font-mono tabular-nums">{i.value}</span>
        </li>
      ))}
    </ul>
  )
}

function LeadName({ lead }: { lead: LeadDTO }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{lead.name ?? 'Sin nombre'}</p>
      {lead.company && <p className="truncate text-xs text-muted-foreground">{lead.company}</p>}
    </div>
  )
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'callback', label: 'Callbacks' },
  { value: 'retry', label: 'Reintentos' },
  { value: 'completed', label: 'Completados' },
  { value: 'dnc', label: 'No llamar' },
]

function LeadsTable({ campaignId }: { campaignId: number }) {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  const { data, isLoading } = useSWR<{ leads: LeadDTO[] }>(
    `/api/campaigns/${campaignId}/leads?${params.toString()}`,
    fetcher,
    { keepPreviousData: true },
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={status === f.value ? 'secondary' : 'ghost'}
              onClick={() => setStatus(f.value)}
              aria-pressed={status === f.value}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead" className="pl-9" aria-label="Buscar lead" />
        </div>
      </div>
      {isLoading && !data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <SimpleTable
          empty="No hay leads con este filtro"
          headers={['Fila', 'Lead', 'Teléfono', 'Estado', 'Resultado', 'Intentos', 'Última llamada']}
          rows={(data?.leads ?? []).map((l) => [
            <span key="r" className="font-mono text-muted-foreground">{l.rowNumber}</span>,
            <LeadName key="n" lead={l} />,
            <span key="p" className="font-mono">{l.phone}</span>,
            <StatusBadge key="s" status={l.status} />,
            <DispositionLabel key="d" disposition={l.disposition} />,
            <span key="a" className="font-mono tabular-nums">{l.attempts}</span>,
            <span key="l" className="text-muted-foreground">{formatDateTime(l.lastCalledAt)}</span>,
          ])}
        />
      )}
    </div>
  )
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {headers.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-accent/40">
              {cells.map((c, j) => (
                <td key={j} className="max-w-72 px-4 py-3 align-middle">
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-12 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
