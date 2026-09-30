import { PageHeader } from '@/components/page-header'
import { CampaignWizard } from '@/components/campaign-wizard'

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="Nueva campaña"
        description="Conecta una pestaña de Google Sheets y define cómo se trabajará la cola."
      />
      <main className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10">
        <CampaignWizard />
      </main>
    </>
  )
}
