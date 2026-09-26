import type { Line } from "@/lib/playbook"
import { cn } from "@/lib/utils"

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function TranscriptPanel({ lines, empty }: { lines: Line[]; empty: string }) {
  return (
    <section aria-label="Transcripción" className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Transcripción</h2>
        <span className="text-xs text-muted-foreground">{lines.length} intervenciones</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {lines.length === 0 && <p className="m-auto max-w-xs text-center text-sm text-muted-foreground text-pretty">{empty}</p>}
        {lines.map((l) => (
          <div key={l.id} className={cn("flex max-w-[85%] flex-col gap-1", l.speaker === "agent" ? "self-end items-end" : "self-start")}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {l.speaker === "agent" ? "Tú" : "Cliente"} · {fmt(l.t)}
            </span>
            <p
              className={cn(
                "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                l.speaker === "agent" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {l.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
