import { Plus } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { IntegrationsPanel } from '@/components/integrations-panel'
import { CampaignList } from '@/components/campaign-list'

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Campañas"
        description="Cada campaña está conectada a una pestaña de tu Google Sheet."
        actions={
          <LinkButton href="/campaigns/new">
            <Plus className="size-4" aria-hidden />
            Nueva campaña
          </LinkButton>
        }
      />
      <main className="flex flex-col gap-8 px-6 py-8 lg:px-10">
        <section aria-labelledby="integrations-title" className="flex flex-col gap-3">
          <h2 id="integrations-title" className="text-sm font-medium text-muted-foreground">
            Conexiones
          </h2>
          <IntegrationsPanel />
        </section>
        <section aria-labelledby="campaigns-title" className="flex flex-col gap-3">
          <h2 id="campaigns-title" className="text-sm font-medium text-muted-foreground">
            Tus campañas
          </h2>
          <CampaignList />
        </section>
      </main>
    </>
  )
}
