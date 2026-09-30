import { AudioWaveform } from 'lucide-react'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <AudioWaveform className="size-4" aria-hidden />
      </div>
      {!compact && (
        <span className="text-base font-semibold tracking-tight">
          Pulse <span className="text-muted-foreground font-normal">Dialer</span>
        </span>
      )}
    </div>
  )
}
