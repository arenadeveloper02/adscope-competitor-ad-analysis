export type AdPlatform = 'Google Ads' | 'Meta' | 'LinkedIn' | 'TikTok'

export interface Competitor {
  id: string
  name: string
  domain: string
  matchScore: number
  description?: string
  isSelf?: boolean
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

export interface CompetitorSearchResult {
  success: boolean
  competitors?: Competitor[]
  error?: string
}

export interface FormatMix {
  image: number
  text: number
  video: number
}

export type CompetitorAdStatus = 'LIVE' | 'PAUSED'

export interface CompetitorScorecard {
  competitorId: string
  name: string
  domain: string
  totalAds: number
  activeAds: number
  formatMix: FormatMix
  marketIntensity: number
  headlineWords: string[]
  status: CompetitorAdStatus
  isSelf?: boolean
}

export interface HeatmapRow {
  competitorName: string
  monthly: number[]
}

export interface CtaUsage {
  label: string
  count: number
}

export interface MessagingTheme {
  theme: string
  frequency: number
}

export type SignalType = 'Opportunity' | 'Trend' | 'Alert' | 'Watch'

export interface StrategicSignal {
  type: SignalType
  title: string
  description: string
}

export interface AdsDashboardKpis {
  totalAds: number
  activePct: number
  imageCreatives: number
  videoCreatives: number
  competitorCount: number
}

export interface AdsDashboardData {
  kpis: AdsDashboardKpis
  scorecards: CompetitorScorecard[]
  heatmap: HeatmapRow[]
  heatmapLabels?: string[]
  keywords: string[]
  ctas: CtaUsage[]
  themes: MessagingTheme[]
  signals: StrategicSignal[]
  ads: CompetitorAd[]
}

export interface AdsAnalysisResult {
  success: boolean
  dashboard?: AdsDashboardData
  error?: string
}
