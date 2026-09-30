export type LeadDTO = {
  id: number
  campaignId: number
  rowNumber: number
  name: string | null
  phone: string | null
  email: string | null
  company: string | null
  extra: Record<string, string>
  status: string
  disposition: string | null
  attempts: number
  lastCalledAt: string | null
  callbackAt: string | null
  notes: string | null
  syncPending: boolean
}

export type CallDTO = {
  id: number
  leadId: number
  status: string
  disposition: string | null
  notes: string | null
  startedAt: string
  endedAt: string | null
  durationSec: number | null
}

export type CampaignStats = {
  total: number
  new: number
  callback: number
  callbackDue: number
  retry: number
  completed: number
  dnc: number
  positive: number
  sales: number
  contacted: number
}

export type CampaignDTO = {
  id: number
  name: string
  spreadsheetId: string
  spreadsheetTitle: string | null
  sheetName: string
  agentPhone: string | null
  maxAttempts: number
  autoAdvance: boolean
  script: string | null
  lastSyncedAt: string | null
  createdAt: string
  stats?: CampaignStats | null
}

export type IntegrationStatus = {
  google: boolean
  ringcentral: {
    connected: boolean
    profile: {
      name: string
      extension: string
      phoneNumbers: { phoneNumber: string; usageType: string; callerId: boolean }[]
    } | null
  }
}

export type RingStatus = { callStatus: string; callerStatus?: string; calleeStatus?: string } | null
