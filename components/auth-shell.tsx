import { CalendarClock, ListOrdered, RefreshCcw } from 'lucide-react'

const FEATURES = [
  { icon: ListOrdered, title: 'Cola inteligente', body: 'Callbacks vencidos primero, luego leads nuevos y reintentos con enfriamiento.' },
  { icon: RefreshCcw, title: 'Sincronía con Google Sheets', body: 'Cada resultado se escribe de vuelta en tu hoja automáticamente.' },
  { icon: CalendarClock, title: 'Callbacks y notas', body: 'Agenda seguimientos y conserva todo el historial del lead.' },
]

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12">{children}</section>
      <aside className="relative hidden flex-col justify-end overflow-hidden border-l bg-card p-12 lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_20%,oklch(0.78_0.16_158/0.18),transparent_45%),linear-gradient(to_right,oklch(1_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.04)_1px,transparent_1px)] [background-size:100%_100%,40px_40px,40px_40px]"
        />
        <div className="relative flex max-w-md flex-col gap-8">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
            En línea con RingCentral
          </div>
          <p className="text-3xl font-semibold leading-tight tracking-tight text-balance">
            Tu call center completo, trabajando sobre la hoja de leads que ya usas.
          </p>
          <ul className="flex flex-col gap-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <f.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}
