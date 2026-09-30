'use client'

import { Loader2, Mic, MicOff, Phone, PhoneOff, SkipForward } from 'lucide-react'
import { formatDuration } from '@/lib/api-client'
import type { LeadDTO, RingStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/dialer/kbd'

const END_LABELS: Record<string, string> = {
  Success: 'Llamada finalizada',
  CannotReach: 'No se pudo contactar',
  NoAnsweredCall: 'Sin respuesta',
  Busy: 'Ocupado',
  Error: 'Error en la llamada',
  Cancelled: 'Llamada colgada',
}

function describe(phase: 'idle' | 'live' | 'wrapup', ring: RingStatus) {
  if (phase === 'idle') return { label: 'Listo para marcar', tone: 'idle' as const }
  if (phase === 'wrapup') {
    return { label: END_LABELS[ring?.callStatus ?? 'Cancelled'] ?? 'Llamada finalizada', tone: 'ended' as const }
  }
  if (ring?.calleeStatus === 'Success') return { label: 'Contestó · en conversación', tone: 'connected' as const }
  if (ring?.callerStatus === 'Setup') return { label: 'Conectando con RingCentral…', tone: 'ringing' as const }
  if (ring?.callerStatus === 'Ringing') return { label: 'Timbrando… esperando que contesten', tone: 'ringing' as const }
  if (ring?.callerStatus === 'Success') return { label: 'Marcando al lead…', tone: 'ringing' as const }
  return { label: 'Llamando a tu teléfono…', tone: 'ringing' as const }
}

export function DialerCallBar({
  phase,
  lead,
  ringStatus,
  elapsed,
  talkElapsed,
  dialing,
  countdown,
  sessionActive,
  onDial,
  onHangup,
  mode,
  muted,
  onToggleMute,
  onSkip,
  onCancelCountdown,
}: {
  mode: 'browser' | 'phone'
  muted: boolean
  onToggleMute: () => void
  phase: 'idle' | 'live' | 'wrapup'
  lead: LeadDTO | null
  ringStatus: RingStatus
  elapsed: number
  talkElapsed: number
  dialing: boolean
  countdown: number | null
  sessionActive: boolean
  onDial: () => void
  onHangup: () => void
  onSkip: () => void
  onCancelCountdown: () => void
}) {
  const state = describe(phase, ringStatus)

  return (
    <section
      aria-label="Control de llamada"
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 transition-colors',
        state.tone === 'connected' && 'border-success/50 bg-success/5',
        state.tone === 'ringing' && 'border-warning/40',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative flex size-3" aria-hidden>
          {(state.tone === 'ringing' || state.tone === 'connected') && (
            <span
              className={cn(
                'absolute inline-flex size-full animate-ping rounded-full opacity-60',
                state.tone === 'connected' ? 'bg-success' : 'bg-warning',
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex size-3 rounded-full',
              state.tone === 'connected' && 'bg-success',
              state.tone === 'ringing' && 'bg-warning',
              state.tone === 'idle' && 'bg-muted-foreground/40',
              state.tone === 'ended' && 'bg-destructive/70',
            )}
          />
        </span>
        <div className="min-w-0" aria-live="polite">
          <p className="font-medium">
            {countdown !== null ? `Marcando siguiente en ${countdown}…` : state.label}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {lead ? `${lead.name ?? 'Sin nombre'} · ${lead.phone ?? 'sin teléfono'}` : 'Sin lead en cola'}
            {sessionActive && ' · Sesión activa'}
          </p>
        </div>
      </div>

      {phase !== 'idle' && (
        <div className="flex gap-6 font-mono tabular-nums">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-sans">Total</span>
            <span>{formatDuration(elapsed)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-sans">Conversación</span>
            <span className={cn(talkElapsed > 0 && 'text-success')}>{formatDuration(talkElapsed)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {countdown !== null ? (
          <Button variant="outline" onClick={onCancelCountdown}>
            Cancelar
          </Button>
        ) : phase === 'live' ? (
          <>
          {mode === 'browser' && (
            <Button variant="outline" onClick={onToggleMute} aria-pressed={muted} className="h-10">
              {muted ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
              {muted ? 'Activar micro' : 'Silenciar'}
            </Button>
          )}
          <Button variant="destructive" onClick={onHangup} className="h-10 px-5">
            <PhoneOff className="size-4" aria-hidden />
            Colgar <Kbd>H</Kbd>
          </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onSkip} disabled={!lead || phase === 'wrapup'}>
              <SkipForward className="size-4" aria-hidden />
              Saltar <Kbd>S</Kbd>
            </Button>
            <Button onClick={onDial} disabled={!lead || dialing || phase === 'wrapup'} className="h-10 px-5">
              {dialing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Phone className="size-4" aria-hidden />}
              Marcar <Kbd>D</Kbd>
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
