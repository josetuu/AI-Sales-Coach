import { CampaignOverview } from '@/components/campaign-overview'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CampaignOverview campaignId={Number(id)} />
}
