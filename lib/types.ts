export type AdPlatform = 'Google Ads' | 'Meta' | 'LinkedIn' | 'TikTok'

export interface Competitor {
  id: string
  name: string
  domain: string
  matchScore: number
}

export interface CompetitorAd {
  id: string
  competitorId: string
  competitorName: string
  headline: string
  copy: string
  platform: AdPlatform
}

export interface ActionResult {
  success: boolean
  error?: string
}
