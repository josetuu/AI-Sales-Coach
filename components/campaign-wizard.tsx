'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ArrowLeft, Check, FileSpreadsheet, Link2, Loader2, Search } from 'lucide-react'
import { apiSend, fetcher, formatDateTime } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/native-select'
import { useConnectGoogle, useIntegrations } from '@/components/integrations-panel'

type Preview = {
  spreadsheetId: string
  title: string
  sheets: string[]
  sheet: string
  headers: string[]
  sample: string[][]
  rowCount: number
  guess: { name?: number; phone?: number; email?: number; company?: number }
}

type Columns = { name?: number; phone?: number; email?: number; company?: number }

const STEPS = ['Hoja de leads', 'Columnas', 'Configuración']

export function CampaignWizard() {
  const router = useRouter()
  const { data: integrations, isLoading: loadingIntegrations } = useIntegrations()
  const [step, setStep] = useState(0)
  const [source, setSource] = useState<string | null>(null)
  const [sheet, setSheet] = useState<string | null>(null)
  const [columns, setColumns] = useState<Columns>({})
  const [name, setName] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [creating, setCreating] = useState(false)

  const previewKey = source
    ? `/api/google/spreadsheets/${encodeURIComponent(source)}${sheet ? `?sheet=${encodeURIComponent(sheet)}` : ''}`
    : null
  const preview = useSWR<Preview>(previewKey, fetcher, {
    revalidateOnFocus: false,
    onSuccess: (data) => {
      setColumns(data.guess)
      if (!name) setName(`${data.title} · ${data.sheet}`)
    },
  })

  if (loadingIntegrations) return <Skeleton className="h-96 rounded-xl" />
  if (!integrations?.google) return <GoogleGate />

  async function create() {
    if (!preview.data || columns.phone === undefined) return
    setCreating(true)
    try {
      const res = await apiSend<{ campaign: { id: number }; imported: number }>('/api/campaigns', 'POST', {
        name,
        spreadsheetId: preview.data.spreadsheetId,
        sheetName: preview.data.sheet,
        columns,
        agentPhone,
        maxAttempts,
      })
      toast.success(`Campaña creada con ${res.imported} leads`)
      router.push(`/campaigns/${res.campaign.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la campaña')
      setCreating(false)
    }
  }

  const rcNumbers = integrations.ringcentral.profile?.phoneNumbers ?? []

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex flex-wrap items-center gap-2" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border font-mono text-xs',
                i < step && 'border-primary bg-primary text-primary-foreground',
                i === step && 'border-primary text-primary',
                i > step && 'text-muted-foreground',
              )}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn('text-sm', i === step ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <SpreadsheetPicker
          selected={source}
          onSelect={(id) => {
            setSource(id)
            setSheet(null)
            setName('')
          }}
          previewState={preview}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && preview.data && (
        <section className="flex flex-col gap-6 rounded-xl border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sheet">Pestaña</Label>
              <NativeSelect id="sheet" value={preview.data.sheet} onChange={(e) => setSheet(e.target.value)}>
                {preview.data.sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex items-end text-sm text-muted-foreground">
              {preview.data.rowCount} filas detectadas en {preview.data.title}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['phone', 'Teléfono *'],
                ['name', 'Nombre'],
                ['company', 'Empresa'],
                ['email', 'Correo'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={`col-${key}`}>{label}</Label>
                <NativeSelect
                  id={`col-${key}`}
                  value={columns[key] ?? ''}
                  onChange={(e) =>
                    setColumns((c) => ({ ...c, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))
                  }
                >
                  <option value="">— Sin asignar —</option>
                  {preview.data!.headers.map((h, i) => (
                    <option key={`${h}-${i}`} value={i}>
                      {h || `Columna ${i + 1}`}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ))}
          </div>
          <SheetPreview headers={preview.data.headers} rows={preview.data.sample} highlight={columns} />
          <p className="text-sm text-muted-foreground">
            Añadiremos columnas <span className="font-mono text-foreground">Dialer …</span> al final de la hoja para
            escribir estado, resultado, intentos, callback y notas.
          </p>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="size-4" aria-hidden />
              Atrás
            </Button>
            <Button onClick={() => setStep(2)} disabled={columns.phone === undefined || preview.isLoading}>
              Continuar
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-6 rounded-xl border bg-card p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="name">Nombre de la campaña</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="agentPhone">Tu teléfono de agente (opcional)</Label>
              <Input
                id="agentPhone"
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                list="rc-numbers"
                inputMode="tel"
              />
              <datalist id="rc-numbers">
                {rcNumbers.map((n) => (
                  <option key={n.phoneNumber} value={n.phoneNumber}>
                    {n.usageType}
                  </option>
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Por defecto hablas desde el navegador. Este número solo se usa en modo &quot;Mi teléfono&quot;.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxAttempts">Intentos máximos por lead</Label>
              <NativeSelect id="maxAttempts" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" aria-hidden />
              Atrás
            </Button>
            <Button onClick={create} disabled={creating || !name.trim()}>
              {creating && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Crear e importar leads
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function GoogleGate() {
  const { connect, pending } = useConnectGoogle()
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-16 text-center">
      <FileSpreadsheet className="size-8 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Conecta Google Sheets</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Necesitamos acceso a tus hojas para leer los leads y escribir los resultados de cada llamada.
        </p>
      </div>
      <Button onClick={connect} disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Conectar cuenta de Google
      </Button>
      <p className="text-xs text-muted-foreground">Al terminar la autorización, vuelve a esta pestaña.</p>
    </div>
  )
}

function SpreadsheetPicker({
  selected,
  onSelect,
  previewState,
  onNext,
}: {
  selected: string | null
  onSelect: (id: string) => void
  previewState: { data?: Preview; error?: Error; isLoading: boolean }
  onNext: () => void
}) {
  const { data, isLoading, error } = useSWR<{ files: { id: string; name: string; modifiedTime: string }[] }>(
    '/api/google/spreadsheets',
    fetcher,
    { revalidateOnFocus: false },
  )
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const files = (data?.files ?? []).filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <section className="flex flex-col gap-6 rounded-xl border bg-card p-6">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (url.trim()) onSelect(url.trim())
        }}
      >
        <Label htmlFor="sheet-url">Pega la URL de tu Google Sheet</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="sheet-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Usar
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">O elige una hoja reciente</p>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="h-8 pl-9"
              aria-label="Buscar hojas"
            />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : error ? (
          <p className="text-sm text-muted-foreground">No pudimos listar tus hojas. Usa la URL directamente.</p>
        ) : (
          <ul className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-1">
            {files.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onSelect(f.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
                    selected === f.id && 'bg-accent ring-1 ring-primary',
                  )}
                >
                  <FileSpreadsheet className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(f.modifiedTime)}</span>
                </button>
              </li>
            ))}
            {!files.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados</li>}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-5">
        <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
          {previewState.isLoading
            ? 'Leyendo hoja…'
            : previewState.error
              ? previewState.error.message
              : previewState.data
                ? `${previewState.data.title} · ${previewState.data.rowCount} filas`
                : 'Ninguna hoja seleccionada'}
        </p>
        <Button onClick={onNext} disabled={!previewState.data || previewState.isLoading}>
          {previewState.isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Continuar
        </Button>
      </div>
    </section>
  )
}

function SheetPreview({ headers, rows, highlight }: { headers: string[]; rows: string[][]; highlight: Columns }) {
  const mapped = new Set(Object.values(highlight).filter((v) => v !== undefined))
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60">
          <tr>
            {headers.map((h, i) => (
              <th
                key={`${h}-${i}`}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2 text-left font-medium',
                  mapped.has(i) ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {h || `Col ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t">
              {headers.map((_, i) => (
                <td key={i} className="max-w-48 truncate whitespace-nowrap px-3 py-2">
                  {row[i] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
