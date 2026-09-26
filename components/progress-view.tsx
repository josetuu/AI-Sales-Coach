import type { Call } from "@/lib/db/schema"
import type { Report } from "@/lib/schemas"

export function ProgressView({ calls }: { calls: Call[] }) {
  const done = calls.filter((c) => c.status === "done" && c.report).reverse()
  if (!done.length) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Tu progreso aparecerá cuando tengas llamadas analizadas.</p>
  }
  const avg = (pick: (r: Report) => number) => Math.round(done.reduce((s, c) => s + pick(c.report!), 0) / done.length)
  const keys = Object.keys(done[0].report!.scores) as (keyof Report["scores"])[]
  const recent = done.slice(-5)
  const earlier = done.slice(0, -5)
  const trend = earlier.length
    ? Math.round(recent.reduce((s, c) => s + c.score!, 0) / recent.length - earlier.reduce((s, c) => s + c.score!, 0) / earlier.length)
    : null

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Llamadas analizadas" value={String(done.length)} />
        <Stat label="Puntuación media" value={String(avg((r) => r.score))} />
        <Stat label="Tendencia" value={trend == null ? "—" : `${trend > 0 ? "+" : ""}${trend}`} />
      </div>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Puntuación por llamada</h2>
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Evolución de puntuaciones">
          {done.slice(-30).map((c) => (
            <div key={c.id} className="flex-1 rounded-t bg-primary/80" style={{ height: `${c.score}%` }} title={`${c.score}`} />
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Media por habilidad</h2>
        <ul className="flex flex-col gap-3">
          {keys.map((k) => {
            const v = avg((r) => r.scores[k])
            return (
              <li key={k} className="flex items-center gap-3 text-sm">
                <span className="w-32 capitalize">{k}</span>
                <span className="h-2 flex-1 rounded-full bg-secondary">
                  <span className="block h-2 rounded-full bg-primary" style={{ width: `${v}%` }} />
                </span>
                <span className="w-8 text-right tabular-nums">{v}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
