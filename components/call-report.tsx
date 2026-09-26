"use client"

import type { Report } from "@/lib/schemas"
import { cn } from "@/lib/utils"

type Item = { title: string; detail: string }

const SECTIONS: { key: keyof Report; title: string; dot: string }[] = [
  { key: "strengths", title: "Puntos fuertes", dot: "bg-success" },
  { key: "weaknesses", title: "Puntos débiles", dot: "bg-destructive" },
  { key: "improvements", title: "Áreas de mejora", dot: "bg-warning" },
  { key: "tips", title: "Consejos concretos", dot: "bg-primary" },
  { key: "techniques", title: "Técnicas para practicar", dot: "bg-primary" },
  { key: "opportunitiesTaken", title: "Oportunidades aprovechadas", dot: "bg-success" },
  { key: "opportunitiesMissed", title: "Oportunidades perdidas", dot: "bg-destructive" },
  { key: "recommendations", title: "Recomendaciones personalizadas", dot: "bg-primary" },
  { key: "extras", title: "Aportes adicionales", dot: "bg-warning" },
]

export function CallReport({ report, onClose }: { report: Report; onClose: () => void }) {
  const tone = report.score >= 75 ? "text-success" : report.score >= 50 ? "text-warning" : "text-destructive"
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 md:flex-row md:items-center">
        <div className="flex flex-col items-center">
          <span className={cn("text-6xl font-bold tabular-nums", tone)}>{report.score}</span>
          <span className="text-xs text-muted-foreground">de 100</span>
        </div>
        <div className="flex-1">
          <h2 className="mb-2 text-xl font-semibold">Análisis de la llamada</h2>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{report.summary}</p>
        </div>
        <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ver transcripción
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(report.scores).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs capitalize text-muted-foreground">{k}</p>
            <p className="text-2xl font-semibold tabular-nums">{v}</p>
            <div className="mt-2 h-1.5 rounded-full bg-secondary">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>

      {report.rewrites.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold">Cómo podrías haberlo dicho</h3>
          <div className="flex flex-col gap-4">
            {report.rewrites.map((r) => (
              <div key={r.said} className="grid gap-2 md:grid-cols-2">
                <p className="rounded-lg bg-destructive/10 p-3 text-sm line-through decoration-destructive/50">{r.said}</p>
                <div className="rounded-lg bg-success/10 p-3 text-sm">
                  <p>{r.better}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ key, title, dot }) => {
          const items = report[key] as Item[]
          if (!items?.length) return null
          return (
            <section key={key} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <span className={cn("size-2.5 rounded-full", dot)} aria-hidden /> {title}
              </h3>
              <ul className="flex flex-col gap-3">
                {items.map((i) => (
                  <li key={i.title}>
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{i.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
