import { TECHNIQUES } from "@/lib/playbook"

export function TechniqueLibrary() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <h2 className="text-2xl font-semibold">Academia de ventas</h2>
      <p className="mb-6 text-sm text-muted-foreground">PNL, comunicación, objeciones y cierre aplicados a seguros.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TECHNIQUES.map((t) => (
          <article key={t.name} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
            <span className="w-fit rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">{t.area}</span>
            <h3 className="font-semibold">{t.name}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.how}</p>
            <p className="mt-auto rounded-lg bg-background p-3 text-sm italic leading-relaxed">{t.example}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
