export function ProgressBar({ total, done }: { total: number; done: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Progreso de campaña</span>
        <span className="font-mono tabular-nums">
          {pct}% <span className="text-muted-foreground">· {done}/{total}</span>
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de campaña"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
