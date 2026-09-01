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
  format?: AdFormat
  active?: boolean
  date?: string
  cta?: string
  landingPage?: string
  /** Keyword data parsed from the Get workflow response for this creative */
  keywords?: string[]
  /** True when this creative belongs to the entered company (competitor_name = self). */
  isSelf?: boolean
  /** Raw creative id from the Get workflow (e.g. CR01573459009736802305). */
  externalAdId?: string
  /**
   * Column 13 from the Get workflow — Google `simgad` screenshot (or other
   * creative still). This is image 1 in the card and click-to-open preview.
   */
  imageUrl?: string
  /**
   * Exact Ads Transparency / Ad Library URL copied from the Get workflow row.
   * Never synthesized — only set when the DB already contains the full URL.
   */
  adUrl?: string
  images?: string[]
  videos?: string[]
  region?: string
  lastShown?: string
  language?: string
  impressions?: string
  valueProposition?: string
  services?: string[]
  pricing?: string
  audience?: string
  about?: string
  messagingAngles?: string[]
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

export type DashboardTab = 'insights' | 'gallery' | 'competitors' | 'creative'

export type AdFormat = 'image' | 'text' | 'video'

export interface SnapshotPayload {
  domain: string
  competitors: Competitor[]
  selectedIds: string[]
  ads: CompetitorAd[]
  dashboard: AdsDashboardData | null
  hasSearched: boolean
  hasFetchedAds: boolean
}

export interface SnapshotResult {
  success: boolean
  snapshot?: SnapshotPayload
  error?: string
}
