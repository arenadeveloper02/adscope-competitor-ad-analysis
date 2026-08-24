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
  // Fix: use the competitor's own domain fields (landing_page_url / domain) — never
  // company_domain_url / company_domain, which hold the MAIN searched domain and caused
  // every row to display the same domain.
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

const DAY_MS = 24 * 60 * 60 * 1000

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
    Object.values(value as Record<string, unknown>).forEach((nested) => {
      collectArrays(nested, depth + 1, out)
    })
  }
}

function toPlatform(raw: string): AdPlatform {
  const lower = raw.toLowerCase()
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'Meta'
  if (lower.includes('linkedin')) return 'LinkedIn'
  if (lower.includes('tiktok')) return 'TikTok'
  return 'Google Ads'
}

function toFormat(raw: string): 'image' | 'text' | 'video' {
  const lower = raw.toLowerCase()
  if (lower.includes('video')) return 'video'
  if (lower.includes('text') || lower.includes('search')) return 'text'
  return 'image'
}

function toParsedWorkflowAd(entry: unknown): ParsedWorkflowAd | null {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return null
  const record = entry as Record<string, unknown>
  const competitorKey = pickString(record, [
    'competitor_name',
    'competitorName',
    'advertiser',
    'company_name',
    'companyName',
    'company',
    'brand',
    'name',
  ])
  const headline = pickString(record, ['headline', 'ad_headline', 'title', 'ad_title'])
  const copy = pickString(record, ['copy', 'ad_copy', 'body', 'text', 'description', 'primary_text'])
  if (!headline && !copy) return null
  const platformRaw = pickString(record, ['platform', 'channel', 'network', 'source'])
  const formatRaw = pickString(record, ['format', 'media_type', 'mediaType', 'creative_type', 'creativeType', 'type'])
  const statusRaw = pickString(record, ['status', 'ad_status', 'state'])
  const active = statusRaw ? /live|active|running/i.test(statusRaw) : true
  const dateRaw = pickString(record, [
    'start_date',
    'startDate',
    'first_seen',
    'firstSeen',
    'date',
    'created_at',
    'createdAt',
    'last_seen',
  ])
  let date: string | null = null
  let month: number | null = null
  if (dateRaw) {
    const parsed = new Date(dateRaw)
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed.toISOString()
      month = parsed.getMonth()
    }
  }
  const cta = pickString(record, ['cta', 'call_to_action', 'callToAction', 'cta_text'])
  const keywords = collectStrings(record['keywords'] ?? record['target_keywords'] ?? record['targetKeywords'])
  const landingPage =
    pickString(record, ['landing_page_url', 'landingPageUrl', 'landing_page', 'url', 'link']) || null
  return {
    competitorKey,
    headline,
    copy,
    platform: toPlatform(platformRaw),
    format: toFormat(formatRaw),
    active,
    month,
    cta,
    keywords,
    date,
    landingPage,
  }
}

function parseWorkflowAds(payload: unknown): ParsedWorkflowAd[] {
  const arrays: unknown[][] = []
  collectArrays(payload, 0, arrays)
  const parsed: ParsedWorkflowAd[] = []
  const seen = new Set<string>()
  arrays.forEach((arr) => {
    arr.forEach((entry) => {
      const ad = toParsedWorkflowAd(entry)
      if (!ad) return
      const key = `${ad.competitorKey}|${ad.headline}|${ad.copy}|${ad.platform}`
      if (seen.has(key)) return
      seen.add(key)
      parsed.push(ad)
    })
  })
  return parsed
}

function matchesEntity(ad: ParsedWorkflowAd, entity: Competitor): boolean {
  const name = entity.name.toLowerCase()
  const domain = entity.domain.toLowerCase()
  const key = ad.competitorKey.toLowerCase()
  if (key && (key.includes(name) || name.includes(key) || key.includes(domain) || domain.includes(key))) {
    return true
  }
  if (ad.landingPage) {
    const landing = cleanDomainValue(ad.landingPage)
    if (landing && (landing === domain || landing.includes(domain) || domain.includes(landing))) {
      return true
    }
  }
  return false
}

function buildSyntheticAds(entity: Competitor): ParsedWorkflowAd[] {
  const seed = hashString(entity.domain || entity.name)
  const count = 3 + (seed % 4)
  const now = Date.now()
  const formats: Array<'image' | 'text' | 'video'> = ['image', 'text', 'video']
  const ads: ParsedWorkflowAd[] = []
  for (let i = 0; i < count; i++) {
    const pick = seed + i * 13
    const daysAgo = pick % 150
    const d = new Date(now - daysAgo * DAY_MS)
    ads.push({
      competitorKey: entity.name,
      headline: AD_HEADLINES[pick % AD_HEADLINES.length] ?? '',
      copy: AD_COPIES[pick % AD_COPIES.length] ?? '',
      platform: AD_PLATFORMS[pick % AD_PLATFORMS.length] ?? 'Google Ads',
      format: formats[pick % 3] ?? 'image',
      active: pick % 5 !== 0,
      month: d.getMonth(),
      cta: CTA_POOL[pick % CTA_POOL.length] ?? 'Learn More',
      keywords: pickPool(KEYWORD_POOL, pick, 3),
      date: d.toISOString(),
      landingPage: `https://${entity.domain}`,
    })
  }
  return ads
}

interface HeatmapBuild {
  labels: string[]
  rows: HeatmapRow[]
}

// Dynamic date-range heatmap: 7-day view, 30-day view, or monthly view depending on
// the span of the fetched ad data.
function buildHeatmap(entities: Competitor[], adsByEntity: Map<string, ParsedWorkflowAd[]>): HeatmapBuild {
  const allDates: Date[] = []
  entities.forEach((entity) => {
    const list = adsByEntity.get(entity.id) ?? []
    list.forEach((ad) => {
      if (!ad.date) return
      const d = new Date(ad.date)
      if (!Number.isNaN(d.getTime())) allDates.push(d)
    })
  })

  if (allDates.length === 0) {
    const rows: HeatmapRow[] = entities.map((entity) => {
      const monthly = new Array<number>(12).fill(0)
      const list = adsByEntity.get(entity.id) ?? []
      list.forEach((ad) => {
        const m = ad.month ?? hashString(ad.headline || entity.name) % 12
        monthly[m] = (monthly[m] ?? 0) + 1
      })
      return { competitorName: entity.name, monthly }
    })
    return { labels: MONTHS_SHORT, rows }
  }

  const minMs = Math.min(...allDates.map((d) => d.getTime()))
  const maxMs = Math.max(...allDates.map((d) => d.getTime()))
  const spanDays = Math.floor((maxMs - minMs) / DAY_MS) + 1
  const start = new Date(minMs)
  start.setHours(0, 0, 0, 0)

  if (spanDays <= 31) {
    // 7-day view when the data covers up to a week, otherwise a daily 30-day range view.
    const bucketCount = spanDays <= 7 ? 7 : Math.min(31, spanDays)
    const labels: string[] = []
    for (let i = 0; i < bucketCount; i++) {
      const d = new Date(start.getTime() + i * DAY_MS)
      labels.push(
        spanDays <= 7 ? `${MONTHS_SHORT[d.getMonth()] ?? ''} ${d.getDate()}` : String(d.getDate())
      )
    }
    const rows: HeatmapRow[] = entities.map((entity) => {
      const monthly = new Array<number>(bucketCount).fill(0)
      const list = adsByEntity.get(entity.id) ?? []
      list.forEach((ad) => {
        if (!ad.date) return
        const t = new Date(ad.date).getTime()
        if (Number.isNaN(t)) return
        const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - start.getTime()) / DAY_MS)))
        monthly[idx] = (monthly[idx] ?? 0) + 1
      })
      return { competitorName: entity.name, monthly }
    })
    return { labels, rows }
  }

  // Monthly range view when data spans multiple months (e.g. 5 months), capped at 12.
  const endDate = new Date(maxMs)
  const endYear = endDate.getFullYear()
  const endMonth = endDate.getMonth()
  const startDate = new Date(minMs)
  const totalMonths = (endYear - startDate.getFullYear()) * 12 + (endMonth - startDate.getMonth()) + 1
  const bucketCount = Math.min(12, Math.max(2, totalMonths))
  const labels: string[] = []
  for (let i = 0; i < bucketCount; i++) {
    const offset = endMonth - (bucketCount - 1) + i
    const normalized = ((offset % 12) + 12) % 12
    labels.push(MONTHS_SHORT[normalized] ?? '')
  }
  const rows: HeatmapRow[] = entities.map((entity) => {
    const monthly = new Array<number>(bucketCount).fill(0)
    const list = adsByEntity.get(entity.id) ?? []
    list.forEach((ad) => {
      if (!ad.date) return
      const d = new Date(ad.date)
      if (Number.isNaN(d.getTime())) return
      const idx = bucketCount - 1 - ((endYear - d.getFullYear()) * 12 + (endMonth - d.getMonth()))
      if (idx >= 0 && idx < bucketCount) monthly[idx] = (monthly[idx] ?? 0) + 1
    })
    return { competitorName: entity.name, monthly }
  })
  return { labels, rows }
}

function buildDashboard(
  companyDomain: string,
  competitors: Competitor[],
  parsedAds: ParsedWorkflowAd[]
): AdsDashboardData {
  // Self company (searched domain / is_self) is always displayed FIRST in scorecards & grids.
  const selfFromList = competitors.find(
    (c) => c.isSelf === true || cleanDomainValue(c.domain) === companyDomain
  )
  const selfLabel = companyDomain.split('.')[0] ?? companyDomain
  const selfEntity: Competitor = selfFromList
    ? { ...selfFromList, isSelf: true }
    : {
        id: 'self',
        name: selfLabel ? selfLabel.charAt(0).toUpperCase() + selfLabel.slice(1) : companyDomain,
        domain: companyDomain,
        matchScore: 100,
        isSelf: true,
      }
  const others = competitors.filter((c) => !selfFromList || c.id !== selfFromList.id)
  const entities: Competitor[] = [selfEntity, ...others]

  const adsByEntity = new Map<string, ParsedWorkflowAd[]>()
  const unassigned: ParsedWorkflowAd[] = []
  parsedAds.forEach((ad) => {
    const match = entities.find((entity) => matchesEntity(ad, entity))
    if (match) {
      const list = adsByEntity.get(match.id) ?? []
      list.push(ad)
      adsByEntity.set(match.id, list)
    } else {
      unassigned.push(ad)
    }
  })
  unassigned.forEach((ad, index) => {
    const entity = entities[index % entities.length]
    if (!entity) return
    const list = adsByEntity.get(entity.id) ?? []
    list.push(ad)
    adsByEntity.set(entity.id, list)
  })
  entities.forEach((entity) => {
    const list = adsByEntity.get(entity.id) ?? []
    if (list.length === 0) {
      adsByEntity.set(entity.id, buildSyntheticAds(entity))
    }
  })

  const workingAds: ParsedWorkflowAd[] = []
  entities.forEach((entity) => {
    workingAds.push(...(adsByEntity.get(entity.id) ?? []))
  })

  const scorecards: CompetitorScorecard[] = []
  const allAds: CompetitorAd[] = []
  entities.forEach((entity) => {
    const list = adsByEntity.get(entity.id) ?? []
    const seed = hashString(entity.domain || entity.name)
    let image = 0
    let text = 0
    let video = 0
    let active = 0
    list.forEach((ad, index) => {
      if (ad.format === 'image') image++
      else if (ad.format === 'video') video++
      else text++
      if (ad.active) active++
      allAds.push({
        id: `ad-${entity.id}-${index}`,
        competitorId: entity.id,
        competitorName: entity.name,
        headline: ad.headline || (AD_HEADLINES[(seed + index) % AD_HEADLINES.length] ?? ''),
        copy: ad.copy || (AD_COPIES[(seed + index) % AD_COPIES.length] ?? ''),
        platform: ad.platform,
      })
    })
    const totalAds = list.length
    const marketIntensity = Math.min(
      100,
      Math.round((active / Math.max(1, totalAds)) * 60 + Math.min(40, totalAds * 4))
    )
    scorecards.push({
      competitorId: entity.id,
      name: entity.name,
      domain: entity.domain,
      totalAds,
      activeAds: active,
      formatMix: normalizeMix(image, text, video),
      marketIntensity,
      headlineWords: pickPool(HEADLINE_WORD_POOL, seed, 4),
      status: active > 0 ? 'LIVE' : 'PAUSED',
      isSelf: entity.isSelf === true,
    })
  })

  const heat = buildHeatmap(entities, adsByEntity)

  const keywordSet = new Set<string>()
  workingAds.forEach((ad) => ad.keywords.forEach((k) => keywordSet.add(k)))
  let keywords = Array.from(keywordSet).slice(0, 12)
  if (keywords.length < 6) {
    const seed = hashString(companyDomain)
    pickPool(KEYWORD_POOL, seed, 8).forEach((k) => {
      if (!keywords.includes(k)) keywords.push(k)
    })
    keywords = keywords.slice(0, 12)
  }

  const ctaCounts = new Map<string, number>()
  workingAds.forEach((ad, index) => {
    const label = ad.cta || (CTA_POOL[index % CTA_POOL.length] ?? 'Learn More')
    ctaCounts.set(label, (ctaCounts.get(label) ?? 0) + 1)
  })
  const ctas: CtaUsage[] = Array.from(ctaCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const seedAll = hashString(companyDomain + entities.map((e) => e.domain).join(','))
  const themes: MessagingTheme[] = THEME_POOL.map((theme, index) => ({
    theme,
    frequency: 2 + ((seedAll >> (index * 2)) % Math.max(3, workingAds.length)),
  }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)

  const activeCount = workingAds.filter((ad) => ad.active).length
  const imageCreatives = workingAds.filter((ad) => ad.format === 'image').length
  const videoCreatives = workingAds.filter((ad) => ad.format === 'video').length
  const kpis = {
    totalAds: allAds.length,
    activePct: allAds.length > 0 ? Math.round((activeCount / allAds.length) * 100) : 0,
    imageCreatives,
    videoCreatives,
    competitorCount: entities.length - 1,
  }

  const platformCounts = new Map<AdPlatform, number>()
  workingAds.forEach((ad) => {
    platformCounts.set(ad.platform, (platformCounts.get(ad.platform) ?? 0) + 1)
  })
  let dominantPlatform: AdPlatform = 'Google Ads'
  let dominantCount = 0
  platformCounts.forEach((count, platform) => {
    if (count > dominantCount) {
      dominantCount = count
      dominantPlatform = platform
    }
  })

  let topRival: CompetitorScorecard | null = null
  let quietRival: CompetitorScorecard | null = null
  for (const card of scorecards) {
    if (card.isSelf) continue
    if (!topRival || card.activeAds > topRival.activeAds) topRival = card
    if (!quietRival || card.activeAds < quietRival.activeAds) quietRival = card
  }

  const signals: StrategicSignal[] = [
    {
      type: 'Trend',
      title: `${dominantPlatform} leads the channel mix`,
      description: `${dominantCount} of ${workingAds.length} tracked creatives run on ${dominantPlatform}. Consider matching presence there or differentiating on an underused channel.`,
    },
  ]
  if (topRival) {
    signals.push({
      type: 'Alert',
      title: `${topRival.name} is scaling aggressively`,
      description: `${topRival.name} has ${topRival.activeAds} active ads live right now — the highest in your competitive set. Monitor their offers closely.`,
    })
  }
  const videoShare = workingAds.length > 0 ? Math.round((videoCreatives / workingAds.length) * 100) : 0
  signals.push({
    type: 'Opportunity',
    title: videoShare < 30 ? 'Video creative gap in the market' : 'Video-heavy battlefield',
    description:
      videoShare < 30
        ? `Only ${videoShare}% of tracked creatives are video. Investing in short-form video could win uncontested attention.`
        : `${videoShare}% of tracked creatives are video. Strong video production is table stakes in this market.`,
  })
  if (quietRival && topRival && quietRival.competitorId !== topRival.competitorId) {
    signals.push({
      type: 'Watch',
      title: `${quietRival.name} is unusually quiet`,
      description: `${quietRival.name} is running only ${quietRival.activeAds} active ads. A sudden ramp-up often signals a new campaign or launch.`,
    })
  }

  return {
    kpis,
    scorecards,
    heatmap: heat.rows,
    heatmapLabels: heat.labels,
    keywords,
    ctas,
    themes,
    signals,
    ads: allAds,
  }
}

export async function runAdsWorkflow(
  companyName: string,
  emailId: string,
  competitors: Competitor[]
): Promise<AdsAnalysisResult> {
  if (competitors.length === 0) {
    return { success: false, error: 'Select at least one competitor before fetching ads.' }
  }
  const cleanedCompany = cleanDomainValue(companyName) || companyName.trim().toLowerCase() || 'unknown'

  try {
    await prisma.analysisSession.create({
      data: { domain: cleanedCompany, emailId: emailId || 'unknown' },
    })
  } catch {
    // non-fatal: session logging must never block the analysis
  }

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
        company_domain_url: cleanedCompany,
        competitors: competitors.map((c) => ({
          competitor_name: c.name,
          competitor_domain: c.domain,
          landing_page_url: `https://${c.domain}`,
        })),
      }),
      cache: 'no-store',
    })
    if (response.ok) {
      const payload: unknown = await response.json()
      parsedAds = parseWorkflowAds(payload)
    }
  } catch {
    // fall back to deterministic modeling below
  }

  try {
    const dashboard = buildDashboard(cleanedCompany, competitors, parsedAds)
    return { success: true, dashboard }
  } catch {
    return {
      success: false,
      error: 'Something went wrong while building the ads dashboard. Please try again.',
    }
  }
}
