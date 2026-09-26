"use client"

import { AlertTriangle, Ear, HelpCircle, Layers, ShieldAlert, Sparkles, Target, Heart, Loader2 } from "lucide-react"
import type { Signal } from "@/lib/playbook"
import type { Tip } from "@/lib/schemas"
import { cn } from "@/lib/utils"

const ACTION_ICON = {
  escucha: Ear,
  pregunta: HelpCircle,
  profundiza: Layers,
  "maneja objeción": ShieldAlert,
  cierra: Target,
} as const

const KIND_STYLE = {
  objection: { cls: "border-destructive/40 bg-destructive/10 text-destructive", Icon: ShieldAlert, name: "Objeción" },
  buying: { cls: "border-success/40 bg-success/10 text-success", Icon: Target, name: "Oportunidad" },
  emotion: { cls: "border-warning/40 bg-warning/10 text-warning", Icon: Heart, name: "Emoción" },
  risk: { cls: "border-warning/40 bg-warning/10 text-warning", Icon: AlertTriangle, name: "Riesgo" },
}

type Props = {
  tip: Tip | null
  loading: boolean
  signals: Signal[]
  ratio: { agent: number; client: number }
  questions: number
}

export function LiveCoachPanel({ tip, loading, signals, ratio, questions }: Props) {
  const ActionIcon = tip ? ACTION_ICON[tip.action] : Sparkles
  const temp = tip?.sentiment ?? 50

  return (
    <aside aria-label="Coach en vivo" className="flex min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="rounded-xl border border-primary/40 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" aria-hidden /> Siguiente paso
          </span>
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Analizando" />}
        </div>
        {tip ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ActionIcon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-semibold capitalize leading-tight">{tip.action}</p>
                <p className="text-xs text-muted-foreground capitalize">Fase: {tip.phase} · {tip.intent}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-pretty">{tip.tip}</p>
            {tip.mistake && (
              <p className="mt-3 flex gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {tip.mistake}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Podrías decir:</p>
              {tip.suggestedReplies.map((r) => (
                <p key={r} className="rounded-lg border border-border bg-background p-2.5 text-sm leading-relaxed">
                  {`“${r}”`}
                </p>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">El siguiente paso recomendado aparecerá aquí cuando termine el análisis.</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Temperatura" value={`${temp}°`} bar={temp} />
        <Metric label="Hablas tú" value={`${ratio.agent}%`} bar={ratio.agent} warn={ratio.agent > 60} />
        <Metric label="Preguntas" value={String(questions)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Señales detectadas</h3>
        {signals.length === 0 ? (
          <p className="text-xs text-muted-foreground">Objeciones, emociones y señales de compra aparecerán aquí al instante.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...signals].reverse().map((s) => {
              const k = KIND_STYLE[s.kind]
              return (
                <li key={s.id} className={cn("rounded-lg border p-3", k.cls)}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <k.Icon className="size-3.5" aria-hidden /> {k.name}: {s.label}
                  </p>
                  <p className="mt-1 text-xs italic opacity-80">{`“${s.quote}”`}</p>
                  <p className="mt-2 text-xs leading-relaxed text-foreground">{s.suggestion}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

function Metric({ label, value, bar, warn }: { label: string; value: string; bar?: number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", warn && "text-warning")}>{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-secondary">
          <div className={cn("h-1 rounded-full", warn ? "bg-warning" : "bg-primary")} style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  )
}
