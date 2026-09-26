import { AlertCircle, Loader2, PhoneIncoming, PhoneOutgoing } from "lucide-react"
import type { Call } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export const contactOf = (c: Call) =>
  c.direction === "Inbound" ? c.fromName || c.fromNumber || "Desconocido" : c.toName || c.toNumber || "Desconocido"

export function CallList({ calls, selected, onSelect }: { calls: Call[]; selected?: number; onSelect: (id: number) => void }) {
  return (
    <ul className="flex flex-col gap-1.5 overflow-y-auto" aria-label="Llamadas">
      {calls.map((c) => {
        const Icon = c.direction === "Inbound" ? PhoneIncoming : PhoneOutgoing
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              aria-current={selected === c.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left",
                selected === c.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-secondary",
              )}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{contactOf(c)}</span>
                <span className="block text-xs text-muted-foreground">
                  {dateFmt.format(new Date(c.startedAt))} · {Math.round(c.duration / 60)} min
                </span>
              </span>
              <Status call={c} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Status({ call }: { call: Call }) {
  if (call.status === "done" && call.score != null) {
    const tone = call.score >= 75 ? "text-success" : call.score >= 50 ? "text-warning" : "text-destructive"
    return <span className={cn("text-sm font-semibold tabular-nums", tone)}>{call.score}</span>
  }
  if (call.status === "error") return <AlertCircle className="size-4 text-destructive" aria-label="Error" />
  return <Loader2 className={cn("size-4 text-muted-foreground", call.status === "processing" && "animate-spin")} aria-label="En cola" />
}
