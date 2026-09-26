"use client"

import { useState, useTransition } from "react"
import { Loader2, PhoneCall } from "lucide-react"
import { getExtensions, linkExtension } from "@/app/actions/calls"
import type { Extension } from "@/lib/ringcentral"
import { Button } from "@/components/ui/button"

export function ExtensionSetup() {
  const [extensions, setExtensions] = useState<Extension[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const load = () =>
    start(async () => {
      setError(null)
      const res = await getExtensions()
      if (res.ok) setExtensions(res.data)
      else setError(res.error)
    })

  const pick = (ext: Extension) =>
    start(async () => {
      const res = await linkExtension(ext)
      if (!res.ok) setError(res.error)
    })

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <PhoneCall className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Conecta tu extensión de RingCentral</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
            Elige tu extensión. Tus llamadas grabadas se importarán, se transcribirán y recibirás un informe de coaching de cada una.
          </p>
        </div>
        {!extensions && (
          <Button onClick={load} disabled={pending} className="self-start">
            {pending && <Loader2 className="animate-spin" aria-hidden />} Buscar extensiones
          </Button>
        )}
        {extensions && (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {extensions.map((x) => (
              <li key={x.id}>
                <button
                  onClick={() => pick(x)}
                  disabled={pending}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm hover:border-primary disabled:opacity-50"
                >
                  <span className="font-medium">{x.name}</span>
                  <span className="text-muted-foreground tabular-nums">Ext. {x.extensionNumber}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
