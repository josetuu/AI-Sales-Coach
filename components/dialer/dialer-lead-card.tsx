'use client'

import { Building2, CalendarClock, Hash, Mail, Phone, RotateCcw, Sparkles } from 'lucide-react'
import { formatDateTime, formatDuration } from '@/lib/api-client'
import type { CallDTO, LeadDTO } from '@/lib/types'
import { DispositionLabel, StatusBadge } from '@/components/status-badge'

const REASON_LABEL = {
  callback: { label: 'Callback vencido', icon: CalendarClock, className: 'bg-warning/15 text-warning' },
  new: { label: 'Lead nuevo', icon: Sparkles, className: 'bg-chart-3/15 text-chart-3' },
  retry: { label: 'Reintento', icon: RotateCcw, className: 'bg-secondary text-muted-foreground' },
  empty: null,
}

function renderScript(script: string, lead: LeadDTO) {
  return script
    .replaceAll('{nombre}', lead.name?.split(' ')[0] ?? '')
    .replaceAll('{empresa}', lead.company ?? '')
}

export function DialerLeadCard({
  lead,
  reason,
  history,
  script,
}: {
  lead: LeadDTO
  reason: 'callback' | 'new' | 'retry' | 'empty'
  history: CallDTO[]
  script: string | null
}) {
  const r = REASON_LABEL[reason]
  const extra = Object.entries(lead.extra ?? {})
  const notes = lead.notes?.split('\n').filter(Boolean).reverse() ?? []

  return (
    <article className="flex flex-1 flex-col gap-6 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {r && (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${r.className}`}>
                <r.icon className="size-3" aria-hidden />
                {r.label}
              </span>
            )}
            <StatusBadge status={lead.status} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance">{lead.name ?? 'Lead sin nombre'}</h2>
          {lead.company && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-4" aria-hidden />
              {lead.company}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="flex items-center gap-2 font-mono text-2xl tabular-nums">
            <Phone className="size-5 text-primary" aria-hidden />
            {lead.phone}
          </p>
          <p className="text-xs text-muted-foreground">
            Intento {lead.attempts + 1} · fila {lead.rowNumber}
          </p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 border-y py-5 sm:grid-cols-2 xl:grid-cols-3">
        {lead.email && <Field icon={Mail} label="Correo" value={lead.email} />}
        {lead.callbackAt && <Field icon={CalendarClock} label="Callback" value={formatDateTime(lead.callbackAt)} />}
        {lead.lastCalledAt && <Field icon={Hash} label="Última llamada" value={formatDateTime(lead.lastCalledAt)} />}
        {extra.map(([k, v]) => (
          <Field key={k} label={k} value={v} />
        ))}
        {!lead.email && !extra.length && !lead.callbackAt && (
          <p className="text-sm text-muted-foreground">Sin datos adicionales en la hoja.</p>
        )}
      </dl>

      {script && (
        <section aria-labelledby="script-title" className="flex flex-col gap-2">
          <h3 id="script-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Guion
          </h3>
          <p className="whitespace-pre-line rounded-lg bg-secondary/60 p-4 leading-relaxed">{renderScript(script, lead)}</p>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="notes-title" className="flex flex-col gap-2">
          <h3 id="notes-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notas anteriores
          </h3>
          {notes.length ? (
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
              {notes.map((n, i) => (
                <li key={i} className="rounded-md border px-3 py-2">
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin notas todavía.</p>
          )}
        </section>
        <section aria-labelledby="history-title" className="flex flex-col gap-2">
          <h3 id="history-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Historial de llamadas
          </h3>
          {history.length ? (
            <ul className="flex max-h-48 flex-col divide-y overflow-y-auto rounded-md border text-sm">
              {history.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-muted-foreground">{formatDateTime(c.startedAt)}</span>
                  <DispositionLabel disposition={c.disposition} />
                  <span className="font-mono tabular-nums text-muted-foreground">{formatDuration(c.durationSec ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Primer contacto con este lead.</p>
          )}
        </section>
      </div>
    </article>
  )
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Mail }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </dt>
      <dd className="truncate text-sm" title={value}>
        {value}
      </dd>
    </div>
  )
}
