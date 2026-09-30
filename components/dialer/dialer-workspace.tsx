'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ChevronLeft, Headphones, Pause, Play, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWebPhone } from '@/components/dialer/use-web-phone'
import { apiSend, fetcher, formatDuration } from '@/lib/api-client'
import type { CallDTO, CampaignDTO, CampaignStats, LeadDTO, RingStatus } from '@/lib/types'
import { DISPOSITION_MAP, type DispositionId } from '@/lib/dispositions'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CampaignSettingsDialog } from '@/components/campaign-settings-dialog'
import { DialerCallBar } from '@/components/dialer/dialer-call-bar'
import { DialerLeadCard } from '@/components/dialer/dialer-lead-card'
import { DialerDisposition } from '@/components/dialer/dialer-disposition'
import { DialerQueue } from '@/components/dialer/dialer-queue'

type QueueResponse = {
  current: LeadDTO | null
  reason: 'callback' | 'new' | 'retry' | 'empty'
  history: CallDTO[]
  upcoming: LeadDTO[]
}

type CallPoll = { ringStatus: RingStatus; ended: boolean }

const AUTO_DIAL_SECONDS = 3
const MODE_KEY = 'dialer:call-mode'
type CallMode = 'browser' | 'phone'

export function DialerWorkspace({ campaignId }: { campaignId: number }) {
  const campaignSWR = useSWR<{ campaign: CampaignDTO; stats: CampaignStats | null }>(
    `/api/campaigns/${campaignId}`,
    fetcher,
  )
  const [skip, setSkip] = useState<number[]>([])
  const queueKey = `/api/campaigns/${campaignId}/queue?skip=${skip.join(',')}`
  const queue = useSWR<QueueResponse>(queueKey, fetcher, { revalidateOnFocus: false, keepPreviousData: true })

  const [callId, setCallId] = useState<number | null>(null)
  const [dialing, setDialing] = useState(false)
  const [localEnded, setLocalEnded] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const [sessionActive, setSessionActive] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [session, setSession] = useState({ calls: 0, talk: 0, positive: 0 })

  const [disposition, setDisposition] = useState<DispositionId | null>(null)
  const [notes, setNotes] = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [saving, setSaving] = useState(false)

  const [mode, setMode] = useState<CallMode>('browser')
  const [browserRing, setBrowserRing] = useState<RingStatus>(null)
  const activeCallRef = useRef<number | null>(null)
  const webPhone = useWebPhone()

  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_KEY)
    if (saved === 'browser' || saved === 'phone') setMode(saved)
  }, [])

  function changeMode(next: CallMode) {
    setMode(next)
    window.localStorage.setItem(MODE_KEY, next)
  }

  const callPoll = useSWR<CallPoll>(
    callId && !localEnded && mode === 'phone' ? `/api/calls/${callId}` : null,
    fetcher,
    {
      refreshInterval: (latest) => (latest?.ended ? 0 : 2000),
      revalidateOnFocus: false,
    },
  )

  const ended = localEnded || (mode === 'phone' && Boolean(callPoll.data?.ended))
  const ringStatus = mode === 'browser' ? browserRing : (callPoll.data?.ringStatus ?? null)
  const phase: 'idle' | 'live' | 'wrapup' = !callId ? 'idle' : ended ? 'wrapup' : 'live'
  const lead = queue.data?.current ?? null
  const campaign = campaignSWR.data?.campaign

  if (ringStatus?.calleeStatus === 'Success' && !connectedAt) setConnectedAt(Date.now())

  useEffect(() => {
    if (phase !== 'live' && countdown === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phase, countdown])

  const resetCall = useCallback(() => {
    activeCallRef.current = null
    setBrowserRing(null)
    setCallId(null)
    setLocalEnded(false)
    setStartedAt(null)
    setConnectedAt(null)
    setDisposition(null)
    setNotes('')
    setCallbackAt('')
  }, [])

  const dial = useCallback(
    async (target: LeadDTO | null) => {
      if (!target || dialing) return
      setCountdown(null)
      setDialing(true)
      try {
        if (mode === 'browser') {
          await dialFromBrowser(target)
          return
        }
        const res = await apiSend<{ call: { id: number } }>('/api/calls', 'POST', { leadId: target.id })
        setCallId(res.call.id)
        setLocalEnded(false)
        setStartedAt(Date.now())
        setConnectedAt(null)
        setSession((s) => ({ ...s, calls: s.calls + 1 }))
      } catch (e) {
        setSessionActive(false)
        toast.error(e instanceof Error ? e.message : 'No se pudo iniciar la llamada')
      } finally {
        setDialing(false)
      }

      async function dialFromBrowser(lead: LeadDTO) {
        const res = await apiSend<{ call: { id: number }; to: string }>('/api/calls', 'POST', {
          leadId: lead.id,
          mode: 'browser',
        })
        const id = res.call.id
        const isActive = () => activeCallRef.current === id
        activeCallRef.current = id
        setCallId(id)
        setLocalEnded(false)
        setStartedAt(Date.now())
        setConnectedAt(null)
        setBrowserRing({ callStatus: 'InProgress', callerStatus: 'Setup' })
        setSession((s) => ({ ...s, calls: s.calls + 1 }))

        try {
          await webPhone.call(res.to, {
            onRinging: () => {
              if (isActive()) setBrowserRing({ callStatus: 'InProgress', callerStatus: 'Ringing' })
            },
            onAnswered: () => {
              if (isActive())
                setBrowserRing({ callStatus: 'InProgress', callerStatus: 'Success', calleeStatus: 'Success' })
            },
            onEnded: (status) => {
              apiSend(`/api/calls/${id}`, 'DELETE', { status }).catch(() => {})
              if (!isActive()) return
              setBrowserRing((r) => ({ ...(r ?? {}), callStatus: status }))
              setLocalEnded(true)
            },
          })
        } catch (error) {
          apiSend(`/api/calls/${id}`, 'DELETE', { status: 'Error' }).catch(() => {})
          if (isActive()) {
            setBrowserRing({ callStatus: 'Error' })
            setLocalEnded(true)
          }
          throw error
        }
      }
    },
    [dialing, mode, webPhone],
  )

  const hangup = useCallback(async () => {
    if (!callId) return
    if (mode === 'browser') {
      await webPhone.hangup().catch(() => setLocalEnded(true))
      return
    }
    setLocalEnded(true)
    try {
      await apiSend(`/api/calls/${callId}`, 'DELETE')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo colgar')
    }
  }, [callId, mode, webPhone])

  const autoAdvance = campaign?.autoAdvance ?? true
  const pendingAutoDial = useRef(false)

  const save = useCallback(async () => {
    if (!lead || !disposition) return
    if (disposition === 'callback' && !callbackAt) {
      toast.error('Elige fecha y hora para el callback')
      return
    }
    setSaving(true)
    try {
      if (phase === 'live') await hangup()
      const res = await apiSend<{ synced: boolean }>(`/api/leads/${lead.id}/disposition`, 'POST', {
        disposition,
        notes,
        callbackAt: callbackAt ? new Date(callbackAt).toISOString() : undefined,
        callId: callId ?? undefined,
      })
      const talk = connectedAt ? Math.round((Date.now() - connectedAt) / 1000) : 0
      setSession((s) => ({
        ...s,
        talk: s.talk + talk,
        positive: s.positive + (disposition === 'sale' || disposition === 'interested' ? 1 : 0),
      }))
      toast.success(`${DISPOSITION_MAP[disposition].label} · ${lead.name ?? lead.phone}`, {
        description: res.synced ? 'Guardado en Google Sheets' : 'Se sincronizará con la hoja más tarde',
      })
      resetCall()
      pendingAutoDial.current = sessionActive && autoAdvance
      await queue.mutate()
      campaignSWR.mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }, [lead, disposition, callbackAt, phase, hangup, notes, callId, connectedAt, resetCall, sessionActive, autoAdvance, queue, campaignSWR])

  useEffect(() => {
    if (!pendingAutoDial.current || queue.isValidating) return
    pendingAutoDial.current = false
    if (queue.data?.current) setCountdown(AUTO_DIAL_SECONDS)
    else setSessionActive(false)
  }, [queue.isValidating, queue.data])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      dial(queue.data?.current ?? null)
      return
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown, dial, queue.data])

  const skipLead = useCallback(() => {
    if (!lead || phase === 'live') return
    setCountdown(null)
    resetCall()
    setSkip((s) => [...s, lead.id])
  }, [lead, phase, resetCall])

  function toggleSession() {
    if (sessionActive) {
      setSessionActive(false)
      setCountdown(null)
      return
    }
    setSessionActive(true)
    if (phase === 'idle' && lead) dial(lead)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      const d = Object.values(DISPOSITION_MAP).find((x) => x.shortcut === e.key)
      if (d && lead) {
        e.preventDefault()
        setDisposition(d.id)
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'd' && phase === 'idle') dial(lead)
      else if (key === 'h' && phase === 'live') hangup()
      else if (key === 's') skipLead()
      else if (e.key === 'Enter' && disposition) save()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lead, phase, dial, hangup, skipLead, disposition, save])

  if (campaignSWR.error) {
    return <p className="p-10 text-destructive">{campaignSWR.error.message}</p>
  }
  if (!campaign || !queue.data) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid flex-1 gap-4 lg:grid-cols-[17rem_1fr_24rem]">
          <Skeleton className="h-[70dvh] rounded-xl" />
          <Skeleton className="h-[70dvh] rounded-xl" />
          <Skeleton className="h-[70dvh] rounded-xl" />
        </div>
      </div>
    )
  }

  const elapsed = startedAt ? (now - startedAt) / 1000 : 0
  const talkElapsed = connectedAt ? (now - connectedAt) / 1000 : 0

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b px-4 py-3 lg:px-6">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="sr-only md:not-sr-only">Campaña</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{campaign.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {mode === 'browser'
              ? 'Audio por el navegador · usa audífonos'
              : `Agente ${campaign.agentPhone ?? 'sin número'}`}{' '}
            · máx. {campaign.maxAttempts} intentos
          </p>
        </div>
        <CallModeToggle mode={mode} onChange={changeMode} disabled={phase !== 'idle' || dialing} />
        <dl className="hidden items-center gap-6 text-sm md:flex">
          <SessionStat label="Llamadas" value={session.calls} />
          <SessionStat label="En línea" value={formatDuration(session.talk)} />
          <SessionStat label="Positivos" value={session.positive} />
        </dl>
        <CampaignSettingsDialog campaign={campaign} onSaved={() => campaignSWR.mutate()} trigger="icon" />
        <Button onClick={toggleSession} variant={sessionActive ? 'secondary' : 'default'} disabled={!lead && !sessionActive}>
          {sessionActive ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {sessionActive ? 'Pausar sesión' : 'Iniciar sesión'}
        </Button>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[17rem_1fr_24rem] lg:p-6">
        <DialerQueue
          current={lead}
          upcoming={queue.data.upcoming}
          stats={campaignSWR.data?.stats ?? null}
          skippedCount={skip.length}
          onResetSkips={() => setSkip([])}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <DialerCallBar
            phase={phase}
            lead={lead}
            ringStatus={ringStatus}
            elapsed={elapsed}
            talkElapsed={talkElapsed}
            dialing={dialing}
            countdown={countdown}
            sessionActive={sessionActive}
            onDial={() => dial(lead)}
            onHangup={hangup}
            mode={mode}
            muted={webPhone.muted}
            onToggleMute={webPhone.toggleMute}
            onSkip={skipLead}
            onCancelCountdown={() => {
              setCountdown(null)
              setSessionActive(false)
            }}
          />
          {lead ? (
            <DialerLeadCard lead={lead} reason={queue.data.reason} history={queue.data.history} script={campaign.script} />
          ) : (
            <EmptyQueue skipped={skip.length} onReset={() => setSkip([])} />
          )}
        </div>

        <DialerDisposition
          disabled={!lead}
          phase={phase}
          value={disposition}
          onChange={setDisposition}
          notes={notes}
          onNotesChange={setNotes}
          callbackAt={callbackAt}
          onCallbackChange={setCallbackAt}
          saving={saving}
          onSave={save}
          autoAdvance={sessionActive && autoAdvance}
        />
      </div>
    </div>
  )
}

function CallModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CallMode
  onChange: (mode: CallMode) => void
  disabled: boolean
}) {
  const options = [
    { id: 'browser' as const, label: 'Navegador', icon: Headphones },
    { id: 'phone' as const, label: 'Mi teléfono', icon: Smartphone },
  ]
  return (
    <div role="group" aria-label="Cómo quieres hablar" className="flex rounded-lg border bg-muted/40 p-0.5">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50',
            mode === id && 'bg-background text-foreground shadow-sm',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )
}

function SessionStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-end">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}

function EmptyQueue({ skipped, onReset }: { skipped: number; onReset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <p className="text-lg font-medium">La cola está vacía</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        No hay leads nuevos, callbacks vencidos ni reintentos disponibles ahora mismo. Sincroniza la hoja o vuelve más tarde.
      </p>
      {skipped > 0 && (
        <Button variant="outline" onClick={onReset}>
          Recuperar {skipped} saltados
        </Button>
      )}
    </div>
  )
}
