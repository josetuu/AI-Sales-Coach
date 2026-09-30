export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  eyebrow?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b px-6 py-6 md:flex-row md:items-end md:justify-between lg:px-10">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow}
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
