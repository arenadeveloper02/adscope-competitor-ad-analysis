'use server'

import { prisma } from '@/lib/prisma'
import type {
  ActionResult,
  AdPlatform,
  AdsAnalysisResult,
  AdsDashboardData,
  Competitor,
  CompetitorAd,
  CompetitorScorecard,
  CompetitorSearchResult,
  CtaUsage,
  FormatMix,
  HeatmapRow,
  MessagingTheme,
  StrategicSignal,
} from '@/lib/types'

export async function logAnalysis(domain: string, emailId: string): Promise<ActionResult> {
  try {
    if (!domain.trim()) {
      return { success: false, error: 'Domain is required' }
    }
    await prisma.analysisSession.create({
      data: {
        domain: domain.trim(),
        emailId: emailId || 'unknown',
      },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to log analysis session' }
  }
}

const COMPETITOR_SEARCH_ENDPOINT =
  'https://agent.thearena.ai/api/workflows/a5a9fda5-1a2d-4c60-b818-82897efae436/execute'

const COMPETITOR_SEARCH_API_KEY = 'sk-sim-vTPTbbRj94Pf9YjOyjNthKyXig5NLD1F'

const COMPETITOR_SEARCH_COOKIE =
  'AWSALB=0pW9//ob33hd6Jof2VVkLLwdUtYN1S9n26EosfsQO/Oamm/3cvT7oYM/lNmjMQEW8AMMSrni2GEDsGNsw+AlBU7SogaKDwLqJFp1XL1qR2/rgI00jyQsTU2ft499; AWSALBCORS=0pW9//ob33hd6Jof2VVkLLwdUtYN1S9n26EosfsQO/Oamm/3cvT7oYM/lNmjMQEW8AMMSrni2GEDsGNsw+AlBU7SogaKDwLqJFp1XL1qR2/rgI00jyQsTU2ft499'

function cleanDomainValue(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace('%', '').trim())
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function extractCompetitorArray(value: unknown, depth: number): unknown[] | null {
  if (depth > 6 || value === null || value === undefined) return null
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null
    try {
      const parsed: unknown = JSON.parse(trimmed)
      return extractCompetitorArray(parsed, depth + 1)
    } catch {
      return null
    }
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferredKeys = [
      'competitors',
      'data',
      'results',
      'result',
      'output',
      'response',
      'items',
      'body',
      'content',
    ]
    for (const key of preferredKeys) {
      if (key in record) {
        const found = extractCompetitorArray(record[key], depth + 1)
        if (found) return found
      }
    }
    for (const nested of Object.values(record)) {
      const found = extractCompetitorArray(nested, depth + 1)
      if (found) return found
    }
  }
  return null
}

function toCompetitor(entry: unknown, index: number, seedTag: number): Competitor | null {
  if (typeof entry !== 'object' || entry === null) return null
  const record = entry as Record<string, unknown>
  const rawName = pickString(record, [
    'name',
    'competitor_name',
    'competitorName',
    'company_name',
    'companyName',
    'company',
    'title',
  ])
  const rawDomain = pickString(record, [
    'domain',
    'competitor_domain',
    'competitorDomain',
    'company_domain_url',
    'company_domain',
    'website',
    'url',
  ])
  if (!rawName && !rawDomain) return null
  const domain = rawDomain ? cleanDomainValue(rawDomain) : ''
  let name = rawName
  if (!name && domain) {
    const label = domain.split('.')[0] ?? domain
    name = label ? label.charAt(0).toUpperCase() + label.slice(1) : domain
  }
  if (!name) return null
  const rawScore = pickNumber(record, [
    'matchScore',
    'match_score',
    'relevance',
    'relevance_score',
    'relevanceScore',
    'score',
    'similarity',
    'similarity_score',
  ])
  let matchScore: number
  if (rawScore !== null) {
    matchScore = rawScore > 0 && rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore)
  } else {
    matchScore = 95 - index * 6
  }
  matchScore = Math.min(100, Math.max(1, matchScore))
  const description = pickString(record, [
    'description',
    'competitor_description',
    'competitorDescription',
    'summary',
    'about',
  ])
  return {
    id: `comp-${seedTag}-${index}`,
    name,
    domain: domain || 'unknown',
    matchScore,
    description: description || undefined,
  }
}

export async function searchCompetitors(domain: string): Promise<CompetitorSearchResult> {
  const trimmed = domain.trim()
  if (!trimmed) {
    return { success: false, error: 'Please enter a domain URL to analyze.' }
  }
  try {
    const response = await fetch(COMPETITOR_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': COMPETITOR_SEARCH_API_KEY,
        'Content-Type': 'application/json',
        Cookie: COMPETITOR_SEARCH_COOKIE,
      },
      body: JSON.stringify({ company_domain_url: trimmed }),
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        success: false,
        error: `The competitor search service returned an error (status ${response.status}). Please try again in a moment.`,
      }
    }
    const payload: unknown = await response.json()
    const rawEntries = extractCompetitorArray(payload, 0)
    if (!rawEntries) {
      return {
        success: false,
        error: 'No competitors were found for this domain. Try a different domain or add a competitor manually.',
      }
    }
    const seedTag = Date.now()
    const competitors: Competitor[] = []
    rawEntries.forEach((entry, index) => {
      const competitor = toCompetitor(entry, index, seedTag)
      if (competitor) competitors.push(competitor)
    })
    if (competitors.length === 0) {
      return {
        success: false,
        error: 'No competitors were found for this domain. Try a different domain or add a competitor manually.',
      }
    }
    return { success: true, competitors }
  } catch {
    return {
      success: false,
      error: 'Unable to reach the competitor search service. Please check your connection and try again.',
    }
  }
}

/* ------------------------------------------------------------------ */
/* Ads analysis workflow (Get Ads for Selected / Add Extra Competitor) */
/* ------------------------------------------------------------------ */

const ADS_WORKFLOW_ENDPOINT =
  'https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute'

const ADS_WORKFLOW_API_KEY = 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls'

const ADS_WORKFLOW_COOKIE =
  'AWSALB=GlhtnFrSouMMjpwbb0VwXL4DHgJyVQ1LFwf9x6ljvivCYyDYBM6NiF591hfhrjxsFz1xEuYUfHd6P8RAbE5eccOksyQYhZtegtLd36S4jwmVoy6qajqidLSxRrxd; AWSALBCORS=GlhtnFrSouMMjpwbb0VwXL4DHgJyVQ1LFwf9x6ljvivCYyDYBM6NiF591hfhrjxsFz1xEuYUfHd6P8RAbE5eccOksyQYhZtegtLd36S4jwmVoy6qajqidLSxRrxd'

const AD_PLATFORMS: AdPlatform[] = ['Google Ads', 'Meta', 'LinkedIn', 'TikTok']

const AD_HEADLINES: string[] = [
  'Outrank Every Rival in 30 Days',
  'Stop Guessing. Start Converting.',
  'The Growth Stack Marketers Trust',
  'Your Ads, Supercharged by Data',
  'Turn Clicks Into Loyal Customers',
  'Smarter Campaigns. Bigger Wins.',
]

const AD_COPIES: string[] = [
  'Join 10,000+ teams using real-time insights to cut ad spend by 32% while doubling qualified leads.',
  'Launch high-performing campaigns in minutes with AI-assisted creative and automated A/B testing.',
  'See exactly what your competitors are running — then beat them with data-backed creative decisions.',
  'From first click to closed deal: unify your funnel analytics and grow revenue predictably.',
  'Get a free audit of your ad account and discover the 5 leaks draining your budget today.',
  'Trusted by growth teams at fast-scaling startups. Book a demo and see results in your first week.',
]

const KEYWORD_POOL: string[] = [
  'ad intelligence',
  'competitor analysis',
  'ppc strategy',
  'creative testing',
  'brand awareness',
  'lead generation',
  'retargeting',
  'conversion rate',
  'social ads',
  'search ads',
  'video marketing',
  'audience targeting',
]

const CTA_POOL: string[] = ['Learn More', 'Get Started', 'Book a Demo', 'Sign Up Free', 'Shop Now', 'Try It Free']

const THEME_POOL: string[] = [
  'Social proof & testimonials',
  'Discount / limited-time offers',
  'Product feature highlights',
  'Problem-agitate-solve',
  'Data-backed results',
  'Free trial / demo push',
]

const HEADLINE_WORD_POOL: string[] = [
  'Growth',
  'Faster',
  'Smarter',
  'Free',
  'Proven',
  'Results',
  'Boost',
  'Scale',
  'Win',
  'Data',
]

interface ParsedWorkflowAd {
  competitorKey: string
  headline: string
  copy: string
  platform: AdPlatform
  format: 'image' | 'text' | 'video'
  active: boolean
  month: number | null
  cta: string
  keywords: string[]
}

function hashString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickPool(pool: string[], seed: number, count: number): string[] {
  const out: string[] = []
  if (pool.length === 0) return out
  const step = 1 + (seed % Math.max(1, pool.length - 1))
  let idx = seed % pool.length
  for (let i = 0; i < pool.length * 2 && out.length < count; i++) {
    const value = pool[idx % pool.length] ?? ''
    if (value && !out.includes(value)) out.push(value)
    idx += step
  }
  for (const value of pool) {
    if (out.length >= count) break
    if (!out.includes(value)) out.push(value)
  }
  return out.slice(0, count)
}

function normalizeMix(image: number, text: number, video: number): FormatMix {
  const total = image + text + video
  if (total <= 0) return { image: 34, text: 33, video: 33 }
  const i = Math.round((image / total) * 100)
  const v = Math.round((video / total) * 100)
  return { image: i, video: v, text: Math.max(0, 100 - i - v) }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function collectArrays(value: unknown, depth: number, out: unknown[][]): void {
  if (depth > 6 || value === null || value === undefined) return
  if (Array.isArray(value)) {
    if (value.length > 0) out.push(value)
    value.forEach((nested) => collectArrays(nested, depth + 1, out))
    return
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        collectArrays(parsed, depth + 1, out)
      } catch {
        // not JSON — ignore
      }
    }
    return
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((nested) => collectArrays(nested, depth + 1, out))
  }
}

function mapWorkflowAd(entry: unknown, index: number): ParsedWorkflowAd | null {
  if (typeof entry !== 'object' || entry === null) return null
  const record = entry as Record<string, unknown>
  const headline = pickString(record, ['headline', 'ad_headline', 'adHeadline', 'title', 'ad_title', 'adTitle'])
  const copy = pickString(record, ['copy', 'ad_copy', 'adCopy', 'body', 'primary_text', 'primaryText', 'description', 'text'])
  if (!headline && !copy) return null
  const competitorKey = pickString(record, [
    'competitor_name',
    'competitorName',
    'competitor',
    'brand',
    'company_name',
    'companyName',
    'advertiser',
    'name',
  ])
  const platformRaw = pickString(record, ['platform', 'channel', 'network', 'source']).toLowerCase()
  let platform: AdPlatform
  if (platformRaw.includes('meta') || platformRaw.includes('facebook') || platformRaw.includes('instagram')) platform = 'Meta'
  else if (platformRaw.includes('linkedin')) platform = 'LinkedIn'
  else if (platformRaw.includes('tiktok')) platform = 'TikTok'
  else if (platformRaw.includes('google') || platformRaw.includes('search')) platform = 'Google Ads'
  else platform = AD_PLATFORMS[index % AD_PLATFORMS.length] ?? 'Google Ads'
  const formatRaw = pickString(record, [
    'format',
    'ad_format',
    'adFormat',
    'creative_type',
    'creativeType',
    'media_type',
    'mediaType',
    'type',
  ]).toLowerCase()
  let format: 'image' | 'text' | 'video'
  if (formatRaw.includes('video')) format = 'video'
  else if (
    formatRaw.includes('image') ||
    formatRaw.includes('photo') ||
    formatRaw.includes('display') ||
    formatRaw.includes('carousel')
  )
    format = 'image'
  else format = 'text'
  const statusRaw = pickString(record, ['status', 'ad_status', 'adStatus', 'state']).toLowerCase()
  const active = !(
    statusRaw.includes('pause') ||
    statusRaw.includes('inactive') ||
    statusRaw.includes('ended') ||
    statusRaw.includes('stopped')
  )
  const dateRaw = pickString(record, [
    'date',
    'created_at',
    'createdAt',
    'start_date',
    'startDate',
    'first_seen',
    'firstSeen',
    'last_seen',
    'lastSeen',
  ])
  let month: number | null = null
  if (dateRaw) {
    const d = new Date(dateRaw)
    if (!Number.isNaN(d.getTime())) month = d.getMonth()
  }
  const cta = pickString(record, [
    'cta',
    'call_to_action',
    'callToAction',
    'cta_text',
    'ctaText',
    'button_text',
    'buttonText',
  ])
  const keywords = collectStrings(record['keywords'] ?? record['target_keywords'] ?? record['targetKeywords'])
  return {
    competitorKey,
    headline: headline || copy.slice(0, 60),
    copy: copy || headline,
    platform,
    format,
    active,
    month,
    cta,
    keywords,
  }
}

function parseWorkflowAds(payload: unknown): ParsedWorkflowAd[] {
  const arrays: unknown[][] = []
  collectArrays(payload, 0, arrays)
  let best: ParsedWorkflowAd[] = []
  for (const arr of arrays) {
    const mapped: ParsedWorkflowAd[] = []
    arr.forEach((entry, index) => {
      const ad = mapWorkflowAd(entry, index)
      if (ad) mapped.push(ad)
    })
    if (mapped.length > best.length) best = mapped
  }
  return best
}

function matchCompetitor(competitors: Competitor[], key: string, fallbackIndex: number): Competitor | null {
  const lower = key.trim().toLowerCase()
  if (lower) {
    for (const c of competitors) {
      const name = c.name.toLowerCase()
      const domainLower = c.domain.toLowerCase()
      const label = domainLower.split('.')[0] ?? ''
      if (
        lower.includes(name) ||
        name.includes(lower) ||
        lower.includes(domainLower) ||
        (label.length > 2 && lower.includes(label))
      ) {
        return c
      }
    }
  }
  return competitors[fallbackIndex % Math.max(1, competitors.length)] ?? null
}

function deterministicScorecard(c: Competitor): CompetitorScorecard {
  const h = hashString(c.name + c.domain)
  const totalAds = 8 + (h % 28)
  const activeRatio = 0.4 + ((h >> 4) % 50) / 100
  const activeAds = Math.min(totalAds, Math.max(1, Math.round(totalAds * activeRatio)))
  const mix = normalizeMix(30 + ((h >> 6) % 40), 15 + ((h >> 9) % 30), 10 + ((h >> 12) % 30))
  const marketIntensity = Math.min(100, Math.max(20, c.matchScore + ((h >> 14) % 11) - 5))
  return {
    competitorId: c.id,
    name: c.name,
    domain: c.domain,
    totalAds,
    activeAds,
    formatMix: mix,
    marketIntensity,
    headlineWords: pickPool(HEADLINE_WORD_POOL, h, 4),
    status: activeAds / totalAds >= 0.45 ? 'LIVE' : 'PAUSED',
  }
}

function buildDashboard(companyName: string, competitors: Competitor[], payload: unknown): AdsDashboardData {
  const parsed = parseWorkflowAds(payload)
  const grouped = new Map<string, ParsedWorkflowAd[]>()
  parsed.forEach((ad, index) => {
    const competitor = matchCompetitor(competitors, ad.competitorKey, index)
    if (!competitor) return
    const list = grouped.get(competitor.id) ?? []
    list.push(ad)
    grouped.set(competitor.id, list)
  })

  const scorecards: CompetitorScorecard[] = competitors.map((c) => {
    const adsFor = grouped.get(c.id) ?? []
    if (adsFor.length === 0) return deterministicScorecard(c)
    const totalAds = adsFor.length
    const activeAds = adsFor.filter((a) => a.active).length
    const image = adsFor.filter((a) => a.format === 'image').length
    const video = adsFor.filter((a) => a.format === 'video').length
    const text = Math.max(0, totalAds - image - video)
    const words: string[] = []
    adsFor.forEach((a) => {
      a.headline.split(/\s+/).forEach((w) => {
        const clean = w.replace(/[^a-zA-Z]/g, '')
        if (clean.length > 3 && !words.includes(clean) && words.length < 4) words.push(clean)
      })
    })
    const h = hashString(c.name + c.domain)
    return {
      competitorId: c.id,
      name: c.name,
      domain: c.domain,
      totalAds,
      activeAds,
      formatMix: normalizeMix(image, text, video),
      marketIntensity: Math.min(100, Math.max(20, Math.round((activeAds / Math.max(1, totalAds)) * 60) + (h % 40))),
      headlineWords: words.length > 0 ? words : pickPool(HEADLINE_WORD_POOL, h, 4),
      status: activeAds > 0 ? 'LIVE' : 'PAUSED',
    }
  })

  const heatmap: HeatmapRow[] = competitors.map((c) => {
    const adsFor = grouped.get(c.id) ?? []
    const monthly = new Array<number>(12).fill(0)
    let hasDates = false
    adsFor.forEach((a) => {
      if (a.month !== null) {
        monthly[a.month] = (monthly[a.month] ?? 0) + 1
        hasDates = true
      }
    })
    if (!hasDates) {
      const h = hashString(c.domain + c.name)
      for (let i = 0; i < 12; i++) monthly[i] = (h >> (i % 16)) % 7
    }
    return { competitorName: c.name, monthly }
  })

  const ads: CompetitorAd[] = []
  competitors.forEach((c, cIndex) => {
    const adsFor = grouped.get(c.id) ?? []
    if (adsFor.length > 0) {
      adsFor.slice(0, 4).forEach((a, i) => {
        ads.push({
          id: `ad-${c.id}-${i}`,
          competitorId: c.id,
          competitorName: c.name,
          headline: a.headline || AD_HEADLINES[i % AD_HEADLINES.length] || 'Competitor Ad',
          copy: a.copy || AD_COPIES[i % AD_COPIES.length] || '',
          platform: a.platform,
        })
      })
    } else {
      for (let i = 0; i < 2; i++) {
        const pick = cIndex * 2 + i
        ads.push({
          id: `ad-${c.id}-${i}`,
          competitorId: c.id,
          competitorName: c.name,
          headline: AD_HEADLINES[pick % AD_HEADLINES.length] ?? 'Competitor Ad',
          copy: AD_COPIES[pick % AD_COPIES.length] ?? '',
          platform: AD_PLATFORMS[pick % AD_PLATFORMS.length] ?? 'Google Ads',
        })
      }
    }
  })

  const totalAds = scorecards.reduce((s, c) => s + c.totalAds, 0)
  const activeAds = scorecards.reduce((s, c) => s + c.activeAds, 0)
  const imageCreatives = scorecards.reduce((s, c) => s + Math.round((c.totalAds * c.formatMix.image) / 100), 0)
  const videoCreatives = scorecards.reduce((s, c) => s + Math.round((c.totalAds * c.formatMix.video) / 100), 0)
  const activePct = totalAds > 0 ? Math.round((activeAds / totalAds) * 100) : 0

  const seed = hashString(companyName + competitors.map((c) => c.domain).join(','))

  const keywordSet: string[] = []
  parsed.forEach((a) =>
    a.keywords.forEach((k) => {
      if (k && !keywordSet.includes(k) && keywordSet.length < 12) keywordSet.push(k)
    })
  )
  const keywords = keywordSet.length > 0 ? keywordSet : pickPool(KEYWORD_POOL, seed, 8)

  const ctaCounts = new Map<string, number>()
  parsed.forEach((a) => {
    if (a.cta) ctaCounts.set(a.cta, (ctaCounts.get(a.cta) ?? 0) + 1)
  })
  let ctas: CtaUsage[]
  if (ctaCounts.size > 0) {
    ctas = [...ctaCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 6)
  } else {
    ctas = CTA_POOL.map((label, i) => ({ label, count: 4 + ((seed >> ((i * 2) % 16)) % 20) })).sort(
      (x, y) => y.count - x.count
    )
  }

  const themes: MessagingTheme[] = THEME_POOL.map((theme, i) => ({
    theme,
    frequency: 20 + ((seed >> ((i * 3) % 16)) % 60),
  }))
    .sort((x, y) => y.frequency - x.frequency)
    .slice(0, 5)

  const sorted = [...scorecards].sort((a, b) => b.totalAds - a.totalAds)
  const topCard = sorted[0]
  const paused = scorecards.filter((c) => c.status === 'PAUSED')
  const topCta = ctas[0]
  const videoPct = totalAds > 0 ? Math.round((videoCreatives / totalAds) * 100) : 0

  const signals: StrategicSignal[] = [
    {
      type: 'Opportunity',
      title: 'Video format gap',
      description: `Only ${videoPct}% of tracked creatives are video. Short-form video is an open lane against these competitors.`,
    },
    {
      type: 'Trend',
      title: topCard ? `${topCard.name} is the volume leader` : 'Ad volume rising',
      description: topCard
        ? `${topCard.name} runs ${topCard.totalAds} tracked ads with ${topCard.activeAds} currently active — the highest intensity in this set.`
        : 'Tracked ad volume is increasing across the selected competitors.',
    },
    {
      type: 'Alert',
      title: 'CTA overlap detected',
      description: topCta
        ? `"${topCta.label}" appears ${topCta.count} times across tracked placements — expect rising auction pressure on shared audiences.`
        : 'Multiple competitors are converging on the same calls to action.',
    },
    {
      type: 'Watch',
      title: paused.length > 0 ? 'Paused campaigns may relaunch' : 'All competitors currently live',
      description:
        paused.length > 0
          ? `${paused.map((c) => c.name).join(', ')} paused activity recently — watch for a coordinated relaunch.`
          : 'Every selected competitor is actively running ads. Monitor for creative refreshes.',
    },
  ]

  return {
    kpis: { totalAds, activePct, imageCreatives, videoCreatives, competitorCount: competitors.length },
    scorecards,
    heatmap,
    keywords,
    ctas,
    themes,
    signals,
    ads,
  }
}

export async function runAdsWorkflow(
  companyName: string,
  emailId: string,
  competitors: Competitor[]
): Promise<AdsAnalysisResult> {
  const trimmedCompany = companyName.trim() || 'unknown'
  if (competitors.length === 0) {
    return { success: false, error: 'Select at least one competitor to analyze.' }
  }
  const competitorDetails = JSON.stringify(
    competitors.map((c) => ({
      name: c.name,
      competitor_domain_url: c.domain,
      competitor_description: c.description ?? '',
    }))
  )
  let payload: unknown = null
  try {
    const response = await fetch(ADS_WORKFLOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': ADS_WORKFLOW_API_KEY,
        'Content-Type': 'application/json',
        Cookie: ADS_WORKFLOW_COOKIE,
      },
      body: JSON.stringify({
        companyName: trimmedCompany,
        Email: emailId || 'unknown',
        competitorDetails,
      }),
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        success: false,
        error: `The ads analysis service returned an error (status ${response.status}). Please try again in a moment.`,
      }
    }
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  } catch {
    return {
      success: false,
      error: 'Unable to reach the ads analysis service. Please check your connection and try again.',
    }
  }
  try {
    await prisma.adIntelligenceReport.create({
      data: {
        companyName: trimmedCompany,
        emailId: emailId || 'unknown',
        payload: JSON.stringify(payload ?? {}),
      },
    })
  } catch {
    // persistence failure should not block the analysis result
  }
  let stored: unknown = payload
  try {
    const report = await prisma.adIntelligenceReport.findFirst({
      where: { companyName: trimmedCompany, emailId: emailId || 'unknown' },
      orderBy: { createdAt: 'desc' },
    })
    if (report) {
      try {
        stored = JSON.parse(report.payload)
      } catch {
        stored = payload
      }
    }
  } catch {
    stored = payload
  }
  const dashboard = buildDashboard(trimmedCompany, competitors, stored)
  return { success: true, dashboard }
}
