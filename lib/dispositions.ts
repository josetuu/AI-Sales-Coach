export type LeadStatus = 'new' | 'callback' | 'retry' | 'completed' | 'dnc'

export type DispositionId =
  | 'sale'
  | 'interested'
  | 'callback'
  | 'no_answer'
  | 'voicemail'
  | 'busy'
  | 'not_interested'
  | 'wrong_number'
  | 'dnc'

export type Disposition = {
  id: DispositionId
  label: string
  shortcut: string
  tone: 'success' | 'warning' | 'neutral' | 'danger'
  nextStatus: LeadStatus
  connected: boolean
}

export const DISPOSITIONS: Disposition[] = [
  { id: 'sale', label: 'Venta cerrada', shortcut: '1', tone: 'success', nextStatus: 'completed', connected: true },
  { id: 'interested', label: 'Interesado', shortcut: '2', tone: 'success', nextStatus: 'completed', connected: true },
  { id: 'callback', label: 'Volver a llamar', shortcut: '3', tone: 'warning', nextStatus: 'callback', connected: true },
  { id: 'no_answer', label: 'No contesta', shortcut: '4', tone: 'neutral', nextStatus: 'retry', connected: false },
  { id: 'voicemail', label: 'Buzón de voz', shortcut: '5', tone: 'neutral', nextStatus: 'retry', connected: false },
  { id: 'busy', label: 'Ocupado', shortcut: '6', tone: 'neutral', nextStatus: 'retry', connected: false },
  { id: 'not_interested', label: 'No interesado', shortcut: '7', tone: 'danger', nextStatus: 'completed', connected: true },
  { id: 'wrong_number', label: 'Número erróneo', shortcut: '8', tone: 'danger', nextStatus: 'completed', connected: false },
  { id: 'dnc', label: 'No llamar (DNC)', shortcut: '9', tone: 'danger', nextStatus: 'dnc', connected: true },
]

export const DISPOSITION_MAP = Object.fromEntries(DISPOSITIONS.map((d) => [d.id, d])) as Record<
  DispositionId,
  Disposition
>

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Nuevo',
  callback: 'Callback',
  retry: 'Reintento',
  completed: 'Completado',
  dnc: 'No llamar',
}

export const RESULT_HEADERS = {
  status: 'Dialer Estado',
  disposition: 'Dialer Resultado',
  attempts: 'Dialer Intentos',
  lastCalled: 'Dialer Última llamada',
  callback: 'Dialer Callback',
  notes: 'Dialer Notas',
} as const
