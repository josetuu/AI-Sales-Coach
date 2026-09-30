import { cn } from '@/lib/utils'
import { DISPOSITION_MAP, STATUS_LABELS, type DispositionId, type LeadStatus } from '@/lib/dispositions'

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-chart-3/15 text-chart-3',
  callback: 'bg-warning/15 text-warning',
  retry: 'bg-secondary text-muted-foreground',
  completed: 'bg-success/15 text-success',
  dnc: 'bg-destructive/15 text-destructive',
}

const TONE_STYLES = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
  danger: 'text-destructive',
}

export function StatusBadge({ status }: { status: string }) {
  const s = status as LeadStatus
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', STATUS_STYLES[s] ?? 'bg-secondary')}>
      {STATUS_LABELS[s] ?? status}
    </span>
  )
}

export function DispositionLabel({ disposition }: { disposition: string | null }) {
  if (!disposition) return <span className="text-muted-foreground">—</span>
  const d = DISPOSITION_MAP[disposition as DispositionId]
  return <span className={cn('text-sm', d ? TONE_STYLES[d.tone] : '')}>{d?.label ?? disposition}</span>
}
