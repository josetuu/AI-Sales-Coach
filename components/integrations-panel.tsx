'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { CheckCircle2, CircleAlert, FileSpreadsheet, Loader2, PhoneCall } from 'lucide-react'
import { apiSend, fetcher, openExternal } from '@/lib/api-client'
import type { IntegrationStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function useIntegrations() {
  return useSWR<IntegrationStatus>('/api/integrations/status', fetcher, { revalidateOnFocus: true })
}

export function useConnectGoogle() {
  return useConnect('/api/google/authorize')
}

export function useConnectRingCentral() {
  return useConnect('/api/ringcentral/authorize')
}

function useConnect(endpoint: string) {
  const [pending, setPending] = useState(false)
  async function connect() {
    setPending(true)
    try {
      const { url } = await apiSend<{ url: string }>(endpoint, 'POST')
      openExternal(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la conexión')
    } finally {
      setPending(false)
    }
  }
  return { connect, pending }
}

export function IntegrationsPanel() {
  const { data, isLoading } = useIntegrations()
  const { connect, pending } = useConnectGoogle()
  const rc = useConnectRingCentral()

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[76px] rounded-xl" />
        <Skeleton className="h-[76px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <IntegrationTile
        icon={<FileSpreadsheet className="size-5" aria-hidden />}
        title="Google Sheets"
        connected={data.google}
        detail={data.google ? 'Tu cuenta está conectada' : 'Conecta tu cuenta para leer tus leads'}
        action={
          !data.google && (
            <Button size="sm" onClick={connect} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Conectar
            </Button>
          )
        }
      />
      <IntegrationTile
        icon={<PhoneCall className="size-5" aria-hidden />}
        title="RingCentral"
        connected={data.ringcentral.connected}
        detail={
          data.ringcentral.profile
            ? `${data.ringcentral.profile.name} · Ext. ${data.ringcentral.profile.extension}`
            : 'Conecta tu cuenta para hacer llamadas'
        }
        action={
          !data.ringcentral.connected && (
            <Button size="sm" onClick={rc.connect} disabled={rc.pending}>
              {rc.pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Conectar
            </Button>
          )
        }
      />
    </div>
  )
}

function IntegrationTile({
  icon,
  title,
  connected,
  detail,
  action,
}: {
  icon: React.ReactNode
  title: string
  connected: boolean
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          {connected ? (
            <CheckCircle2 className="size-4 text-success" aria-label="Conectado" />
          ) : (
            <CircleAlert className="size-4 text-warning" aria-label="No conectado" />
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  )
}
