import { DialerWorkspace } from '@/components/dialer/dialer-workspace'

export default async function DialerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DialerWorkspace campaignId={Number(id)} />
}
