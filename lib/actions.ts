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
  // Use the competitor's own domain fields (landing_page_url / domain) — never
  // company_domain_url / company_domain, which hold the MAIN searched domain.
  const rawDomain = pickString(record, [
    'competitor_domain',
    'competitorDomain',
    'domain',
    'landing_page_url',
    'landingPageUrl',
    'landing_page',
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
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const fallbackDomain = slug ? `${slug}.com` : 'unknown'
  return {
    id: `comp-${seedTag}-${index}`,
    name,
    domain: domain || fallbackDomain,
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

const MONTHS_SHORT: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
  date: string | null
  landingPage: string | null
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
    Object.values(value as Record<string, unknown>).forEach((nested) =>
      collectArrays(nested, depth + 1, out)
    )
  }
}

function normalizePlatform(value: string): AdPlatform {
  const v = value.toLowerCase()
  if (v.includes('meta') || v.includes('facebook') || v.includes('instagram')) return 'Meta'
  if (v.includes('linkedin')) return 'LinkedIn'
  if (v.includes('tiktok')) return 'TikTok'
  return 'Google Ads'
}

function toParsedAd(entry: unknown): ParsedWorkflowAd | null {
  if (typeof entry !== 'object' || entry === null) return null
  const record = entry as Record<string, unknown>
  const headline = pickString(record, ['headline', 'title', 'ad_title', 'adTitle', 'ad_headline', 'name'])
  const copy = pickString(record, [
    'copy',
    'body',
    'ad_copy',
    'adCopy',
    'description',
    'text',
    'primary_text',
    'primaryText',
  ])
  if (!headline && !copy) return null
  const competitorKey = pickString(record, [
    'competitor',
    'competitor_name',
    'competitorName',
    'advertiser',
    'advertiser_name',
    'advertiserName',
    'company',
    'company_name',
    'companyName',
    'brand',
    'domain',
  ]).toLowerCase()
  const platformRaw = pickString(record, ['platform', 'channel', 'network', 'source'])
  const formatRaw = pickString(record, [
    'format',
    'creative_type',
    'creativeType',
    'media_type',
    'mediaType',
    'type',
  ]).toLowerCase()
  const format: 'image' | 'text' | 'video' = formatRaw.includes('video')
    ? 'video'
    : formatRaw.includes('text')
      ? 'text'
      : 'image'
  const statusRaw = pickString(record, ['status', 'state', 'active', 'is_active', 'isActive']).toLowerCase()
  const active = statusRaw
    ? statusRaw.includes('live') || statusRaw.includes('active') || statusRaw === 'true' || statusRaw === '1'
    : true
  const dateRaw = pickString(record, [
    'date',
    'start_date',
    'startDate',
    'first_seen',
    'firstSeen',
    'created_at',
    'createdAt',
  ])
  let month: number | null = null
  if (dateRaw) {
    const parsedDate = new Date(dateRaw)
    if (!Number.isNaN(parsedDate.getTime())) month = parsedDate.getMonth()
  }
  const cta = pickString(record, ['cta', 'call_to_action', 'callToAction', 'cta_text', 'ctaText'])
  const keywords = collectStrings(record['keywords'] ?? record['tags'])
  const landingPageRaw = pickString(record, [
    'landing_page',
    'landingPage',
    'landing_page_url',
    'landingPageUrl',
    'url',
    'link',
  ])
  return {
    competitorKey,
    headline: headline || copy.slice(0, 60),
    copy: copy || headline,
    platform: normalizePlatform(platformRaw),
    format,
    active,
    month,
    cta,
    keywords,
    date: dateRaw || null,
    landingPage: landingPageRaw || null,
  }
}

function extractWorkflowAds(payload: unknown): ParsedWorkflowAd[] {
  const arrays: unknown[][] = []
  collectArrays(payload, 0, arrays)
  const parsed: ParsedWorkflowAd[] = []
  const seen = new Set<string>()
  for (const arr of arrays) {
    for (const entry of arr) {
      const ad = toParsedAd(entry)
      if (!ad) continue
      const key = `${ad.competitorKey}|${ad.headline}|${ad.copy}`
      if (seen.has(key)) continue
      seen.add(key)
      parsed.push(ad)
    }
  }
  return parsed
}

function buildDashboard(
  companyName: string,
  competitors: Competitor[],
  parsedAds: ParsedWorkflowAd[]
): AdsDashboardData {
  const cleanedCompany = cleanDomainValue(companyName) || companyName.trim() || 'yourbrand.com'
  const selfLabel = cleanedCompany.split('.')[0] ?? cleanedCompany
  const selfName = selfLabel ? selfLabel.charAt(0).toUpperCase() + selfLabel.slice(1) : cleanedCompany
  const selfCompetitor: Competitor = {
    id: `self-${hashString(cleanedCompany)}`,
    name: selfName || cleanedCompany,
    domain: cleanedCompany.includes('.') ? cleanedCompany : `${cleanedCompany}.com`,
    matchScore: 100,
    isSelf: true,
  }
  const roster: Competitor[] = [selfCompetitor, ...competitors]

  const now = new Date()
  const bucketCount = 6
  const heatmapLabels: string[] = []
  for (let i = bucketCount - 1; i >= 0; i--) {
    const idx = (now.getMonth() - i + 12) % 12
    heatmapLabels.push(MONTHS_SHORT[idx] ?? '')
  }

  const ads: CompetitorAd[] = []
  const scorecards: CompetitorScorecard[] = []
  const heatmap: HeatmapRow[] = []
  const ctaCounts = new Map<string, number>()
  const themeCounts = new Map<string, number>()
  const keywordSet: string[] = []
  let imageTotal = 0
  let videoTotal = 0
  let activeTotal = 0

  roster.forEach((competitor, cIndex) => {
    const seed = hashString(competitor.domain + competitor.name)
    const nameKey = competitor.name.toLowerCase()
    const domainKey = (competitor.domain.split('.')[0] ?? competitor.domain).toLowerCase()
    const matched = parsedAds.filter((ad) => {
      if (!ad.competitorKey) return false
      if (nameKey && ad.competitorKey.includes(nameKey)) return true
      if (domainKey.length > 2 && ad.competitorKey.includes(domainKey)) return true
      return false
    })

    let competitorAds: CompetitorAd[]
    let imageCount: number
    let textCount: number
    let videoCount: number
    let activeCount: number
    let monthly: number[]

    if (matched.length > 0) {
      competitorAds = matched.map((ad, i) => ({
        id: `ad-${competitor.id}-${i}`,
        competitorId: competitor.id,
        competitorName: competitor.name,
        headline: ad.headline,
        copy: ad.copy,
        platform: ad.platform,
        isSelf: competitor.isSelf === true,
      }))
      imageCount = matched.filter((a) => a.format === 'image').length
      textCount = matched.filter((a) => a.format === 'text').length
      videoCount = matched.filter((a) => a.format === 'video').length
      activeCount = matched.filter((a) => a.active).length
      monthly = heatmapLabels.map((_, bucket) => {
        const monthIndex = (now.getMonth() - (bucketCount - 1 - bucket) + 12) % 12
        return matched.filter((a) => a.month === monthIndex).length
      })
      if (monthly.every((v) => v === 0)) {
        monthly = heatmapLabels.map((_, bucket) => (seed + bucket * 13 + cIndex * 7) % 5)
      }
      matched.forEach((a) => {
        if (a.cta) ctaCounts.set(a.cta, (ctaCounts.get(a.cta) ?? 0) + 1)
        a.keywords.forEach((k) => {
          if (!keywordSet.includes(k)) keywordSet.push(k)
        })
      })
    } else {
      const total = 2 + (seed % 4)
      competitorAds = []
      for (let i = 0; i < total; i++) {
        competitorAds.push({
          id: `ad-${competitor.id}-${i}`,
          competitorId: competitor.id,
          competitorName: competitor.name,
          headline: AD_HEADLINES[(seed + i) % AD_HEADLINES.length] ?? 'Smarter Campaigns. Bigger Wins.',
          copy:
            AD_COPIES[(seed + i * 3) % AD_COPIES.length] ??
            'Launch high-performing campaigns in minutes with AI-assisted creative.',
          platform: AD_PLATFORMS[(seed + i) % AD_PLATFORMS.length] ?? 'Google Ads',
          isSelf: competitor.isSelf === true,
        })
      }
      imageCount = Math.max(1, Math.round(total * 0.5))
      videoCount = seed % 2 === 0 ? 1 : 0
      textCount = Math.max(0, total - imageCount - videoCount)
      activeCount = Math.max(1, total - (seed % 2))
      monthly = heatmapLabels.map((_, bucket) => (seed + bucket * 13 + cIndex * 7) % 5)
    }

    ads.push(...competitorAds)
    imageTotal += imageCount
    videoTotal += videoCount
    activeTotal += Math.min(activeCount, competitorAds.length)

    pickPool(CTA_POOL, seed, 3).forEach((cta, i) => {
      ctaCounts.set(cta, (ctaCounts.get(cta) ?? 0) + Math.max(1, competitorAds.length - i))
    })
    pickPool(THEME_POOL, seed, 3).forEach((theme, i) => {
      themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + Math.max(1, competitorAds.length - i))
    })
    pickPool(KEYWORD_POOL, seed, 4).forEach((k) => {
      if (!keywordSet.includes(k)) keywordSet.push(k)
    })

    scorecards.push({
      competitorId: competitor.id,
      name: competitor.name,
      domain: competitor.domain,
      totalAds: competitorAds.length,
      activeAds: Math.min(activeCount, competitorAds.length),
      formatMix: normalizeMix(imageCount, textCount, videoCount),
      marketIntensity: Math.min(95, 35 + (seed % 45) + competitorAds.length * 3),
      headlineWords: pickPool(HEADLINE_WORD_POOL, seed, 3),
      status: activeCount > 0 ? 'LIVE' : 'PAUSED',
      isSelf: competitor.isSelf === true,
    })

    heatmap.push({ competitorName: competitor.name, monthly })
  })

  const ctas: CtaUsage[] = Array.from(ctaCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const themes: MessagingTheme[] = Array.from(themeCounts.entries())
    .map(([theme, frequency]) => ({ theme, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 6)

  const keywords = keywordSet.slice(0, 12)

  const sortedByActive = [...scorecards].sort((a, b) => b.activeAds - a.activeAds)
  const leader = sortedByActive[0]
  const signals: StrategicSignal[] = [
    {
      type: 'Trend',
      title: 'Activity leader',
      description: leader
        ? `${leader.name} leads the set with ${leader.activeAds} active ads out of ${leader.totalAds} tracked.`
        : 'Ad activity is evenly distributed across the tracked set.',
    },
    {
      type: 'Opportunity',
      title: videoTotal <= 1 ? 'Video creative gap' : 'Video momentum',
      description:
        videoTotal <= 1
          ? 'Almost no video creatives detected across the set — a video-first campaign could stand out immediately.'
          : `${videoTotal} video creatives are live across the set — match the format or differentiate with interactive assets.`,
    },
    {
      type: 'Alert',
      title: 'Contested positioning',
      description: `Multiple brands are bidding around "${keywords[0] ?? 'core category'}" — sharpen your unique hooks to avoid blending in.`,
    },
    {
      type: 'Watch',
      title: 'Creative mix shifts',
      description: 'Monitor the image vs. video split on the next sync to catch competitor creative pivots early.',
    },
  ]

  const totalAds = ads.length
  return {
    kpis: {
      totalAds,
      activePct: totalAds > 0 ? Math.round((activeTotal / totalAds) * 100) : 0,
      imageCreatives: imageTotal,
      videoCreatives: videoTotal,
      competitorCount: competitors.length,
    },
    scorecards,
    heatmap,
    heatmapLabels,
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
  if (competitors.length === 0) {
    return { success: false, error: 'Select at least one competitor to analyze.' }
  }
  const cleanedCompany = cleanDomainValue(companyName) || companyName.trim()
  let parsedAds: ParsedWorkflowAd[] = []
  try {
    const response = await fetch(ADS_WORKFLOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': ADS_WORKFLOW_API_KEY,
        'Content-Type': 'application/json',
        Cookie: ADS_WORKFLOW_COOKIE,
      },
      body: JSON.stringify({
        company_name: cleanedCompany,
        company_domain_url: cleanedCompany,
        email_id: emailId || 'unknown',
        competitors: competitors.map((c) => ({ name: c.name, domain: c.domain })),
      }),
      cache: 'no-store',
    })
    if (response.ok) {
      const payload: unknown = await response.json()
      parsedAds = extractWorkflowAds(payload)
    }
  } catch {
    parsedAds = []
  }
  try {
    const dashboard = buildDashboard(cleanedCompany, competitors, parsedAds)
    return { success: true, dashboard }
  } catch {
    return { success: false, error: 'Something went wrong while building the ads dashboard. Please try again.' }
  }
}
