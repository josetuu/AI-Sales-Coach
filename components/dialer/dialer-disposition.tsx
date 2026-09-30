'use client'

import { Loader2 } from 'lucide-react'
import { DISPOSITIONS, type DispositionId } from '@/lib/dispositions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Kbd } from '@/components/dialer/kbd'

const TONE = {
  success: 'data-[active=true]:border-success data-[active=true]:bg-success/10 data-[active=true]:text-success',
  warning: 'data-[active=true]:border-warning data-[active=true]:bg-warning/10 data-[active=true]:text-warning',
  neutral: 'data-[active=true]:border-foreground/40 data-[active=true]:bg-secondary',
  danger: 'data-[active=true]:border-destructive data-[active=true]:bg-destructive/10 data-[active=true]:text-destructive',
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function presets() {
  const inHour = new Date(Date.now() + 60 * 60_000)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)
  const inTwoDays = new Date()
  inTwoDays.setDate(inTwoDays.getDate() + 2)
  inTwoDays.setHours(10, 0, 0, 0)
  return [
    { label: 'En 1 hora', value: toLocalInput(inHour) },
    { label: 'Mañana 10:00', value: toLocalInput(tomorrow) },
    { label: 'En 2 días', value: toLocalInput(inTwoDays) },
  ]
}

export function DialerDisposition({
  disabled,
  phase,
  value,
  onChange,
  notes,
  onNotesChange,
  callbackAt,
  onCallbackChange,
  saving,
  onSave,
  autoAdvance,
}: {
  disabled: boolean
  phase: 'idle' | 'live' | 'wrapup'
  value: DispositionId | null
  onChange: (d: DispositionId) => void
  notes: string
  onNotesChange: (v: string) => void
  callbackAt: string
  onCallbackChange: (v: string) => void
  saving: boolean
  onSave: () => void
  autoAdvance: boolean
}) {
  return (
    <aside
      aria-label="Resultado de la llamada"
      className={cn(
        'flex flex-col gap-5 rounded-xl border bg-card p-5 transition-colors',
        phase === 'wrapup' && 'border-primary/50',
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Resultado</h2>
        {phase === 'wrapup' && <span className="text-xs text-primary">Registra el resultado</span>}
      </div>

      <fieldset disabled={disabled} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <legend className="sr-only">Disposición</legend>
        {DISPOSITIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            data-active={value === d.id}
            aria-pressed={value === d.id}
            onClick={() => onChange(d.id)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50',
              TONE[d.tone],
            )}
          >
            <span className="truncate">{d.label}</span>
            <Kbd className="ml-0">{d.shortcut}</Kbd>
          </button>
        ))}
      </fieldset>

      {value === 'callback' && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <Label htmlFor="callbackAt">Fecha y hora del callback</Label>
          <Input
            id="callbackAt"
            type="datetime-local"
            value={callbackAt}
            onChange={(e) => onCallbackChange(e.target.value)}
            className="[color-scheme:dark]"
          />
          <div className="flex flex-wrap gap-1.5">
            {presets().map((p) => (
              <Button key={p.label} type="button" size="xs" variant="outline" onClick={() => onCallbackChange(p.value)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Resumen, objeciones, próximos pasos…"
          className="min-h-32 flex-1"
          disabled={disabled}
        />
      </div>

      <Button onClick={onSave} disabled={disabled || !value || saving} className="h-11">
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {autoAdvance ? 'Guardar y marcar siguiente' : 'Guardar y siguiente'}
        <Kbd>↵</Kbd>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        El resultado se escribe en tu Google Sheet al guardar.
      </p>
    </aside>
  )
}
