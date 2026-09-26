"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Phone, RefreshCw, RotateCcw, Zap } from "lucide-react"
import { detectSignals, questionCount, talkRatio } from "@/lib/playbook"
import type { Call } from "@/lib/db/schema"
import { enableAutoSync, retry, syncCalls } from "@/app/actions/calls"
import { authClient } from "@/lib/auth-client"
import { TranscriptPanel } from "./transcript-panel"
import { LiveCoachPanel } from "./live-coach-panel"
import { CallReport } from "./call-report"
import { TechniqueLibrary } from "./technique-library"
import { CallList, contactOf } from "./call-list"
import { ExtensionSetup } from "./extension-setup"
import { ProgressView } from "./progress-view"
import { cn } from "@/lib/utils"

type View = "calls" | "report" | "progress" | "academy"
type Link = { extensionNumber: string | null; extensionName: string | null }

export function CoachApp({ userName, link, calls }: { userName: string; link: Link | null; calls: Call[] }) {
  const router = useRouter()
  const [view, setView] = useState<View>("calls")
  const [selectedId, setSelectedId] = useState<number | undefined>(calls[0]?.id)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const selected = calls.find((c) => c.id === selectedId) ?? calls[0]
  const busy = calls.some((c) => c.status === "pending" || c.status === "processing")

  useEffect(() => {
    if (!busy) return
    const id = setInterval(() => router.refresh(), 8000)
    return () => clearInterval(id)
  }, [busy, router])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn()
      setNotice(res.ok ? { ok: true, text: success } : { ok: false, text: res.error ?? "Error" })
      router.refresh()
    })

  const lines = selected?.transcript ?? []
  const signals = lines.flatMap(detectSignals)

  const signOut = async () => {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Phone className="size-4" aria-hidden />
          </span>
          <h1 className="font-semibold">AI Sales Coach</h1>
          {link && <span className="hidden text-xs text-muted-foreground sm:inline">· Ext. {link.extensionNumber}</span>}
        </div>
        <nav className="ml-auto flex gap-1 rounded-lg bg-secondary p-1 text-sm" aria-label="Secciones">
          {([
            ["calls", "Llamadas"],
            ["report", "Informe"],
            ["progress", "Progreso"],
            ["academy", "Academia"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              disabled={v === "report" && !selected?.report}
              className={cn(
                "rounded-md px-3 py-1.5 disabled:opacity-40",
                view === v ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
        <button onClick={signOut} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label={`Cerrar sesión de ${userName}`}>
          <LogOut className="size-4" aria-hidden />
        </button>
      </header>

      {!link && view === "calls" && <ExtensionSetup />}

      {link && view === "calls" && (
        <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => run(syncCalls, "Llamadas sincronizadas. Las nuevas se están analizando.")}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden /> Sincronizar RingCentral
            </button>
            <button
              onClick={() => run(enableAutoSync, "Sincronización automática activada: cada llamada grabada se analizará al colgar.")}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              <Zap className="size-4" aria-hidden /> Activar automático
            </button>
            {busy && <span className="text-xs text-muted-foreground">Analizando llamadas…</span>}
          </div>
          {notice && (
            <p role="status" className={cn("rounded-lg p-3 text-sm", notice.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
              {notice.text}
            </p>
          )}

          {calls.length === 0 ? (
            <p className="m-auto max-w-sm text-center text-sm text-muted-foreground text-pretty">
              Aún no hay llamadas. Pulsa «Sincronizar RingCentral» para importar las llamadas grabadas de los últimos 7 días (de 20 segundos o más).
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr_360px]">
              <CallList calls={calls} selected={selected?.id} onSelect={setSelectedId} />
              <div className="flex min-h-0 flex-col gap-3">
                {selected && (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate font-medium">{contactOf(selected)}</h2>
                    {selected.status === "error" && (
                      <button
                        onClick={() => run(() => retry(selected.id), "Reintentando análisis…")}
                        disabled={pending}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs"
                      >
                        <RotateCcw className="size-3.5" aria-hidden /> Reintentar
                      </button>
                    )}
                  </div>
                )}
                {selected?.status === "error" && (
                  <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{selected.error}</p>
                )}
                <TranscriptPanel
                  lines={lines}
                  empty={selected?.status === "error" ? "No se pudo transcribir esta llamada." : "Transcribiendo la grabación…"}
                />
              </div>
              <div className="flex min-h-0 flex-col gap-3">
                {selected?.report && (
                  <button onClick={() => setView("report")} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    Ver informe completo · {selected.score}/100
                  </button>
                )}
                <LiveCoachPanel
                  tip={selected?.report?.nextStep ?? null}
                  loading={selected?.status === "processing"}
                  signals={signals}
                  ratio={talkRatio(lines)}
                  questions={questionCount(lines)}
                />
              </div>
            </div>
          )}
        </main>
      )}

      {view === "report" && selected?.report && (
        <main className="flex-1 overflow-y-auto">
          <CallReport report={selected.report} onClose={() => setView("calls")} />
        </main>
      )}

      {view === "progress" && (
        <main className="flex-1 overflow-y-auto">
          <ProgressView calls={calls} />
        </main>
      )}

      {view === "academy" && (
        <main className="flex-1 overflow-y-auto">
          <TechniqueLibrary />
        </main>
      )}
    </div>
  )
}
