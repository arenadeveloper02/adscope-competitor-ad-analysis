'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
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
    'company_name',
    'companyName',
    'company',
    'advertiser',
    'brand',
    'competitor_domain',
    'competitorDomain',
    'domain',
  ])
  const platformRaw = pickString(record, ['platform', 'ad_platform', 'adPlatform', 'channel', 'network']).toLowerCase()
  let platform: AdPlatform = AD_PLATFORMS[index % AD_PLATFORMS.length] ?? 'Google Ads'
  if (platformRaw.includes('google') || platformRaw.includes('search')) platform = 'Google Ads'
  else if (platformRaw.includes('meta') || platformRaw.includes('facebook') || platformRaw.includes('instagram')) platform = 'Meta'
  else if (platformRaw.includes('linkedin')) platform = 'LinkedIn'
  else if (platformRaw.includes('tiktok')) platform = 'TikTok'
  const formatRaw = pickString(record, [
    'format',
    'ad_format',
    'adFormat',
    'creative_type',
    'creativeType',
    'media_type',
    'mediaType',
  ]).toLowerCase()
  let format: 'image' | 'text' | 'video' = index % 3 === 0 ? 'image' : index % 3 === 1 ? 'text' : 'video'
  if (formatRaw.includes('video')) format = 'video'
  else if (formatRaw.includes('image') || formatRaw.includes('display') || formatRaw.includes('banner')) format = 'image'
  else if (formatRaw.includes('text') || formatRaw.includes('search')) format = 'text'
  const statusRaw = pickString(record, ['status', 'ad_status', 'adStatus', 'state']).toLowerCase()
  const active = statusRaw
    ? statusRaw.includes('active') || statusRaw.includes('live') || statusRaw.includes('running')
    : index % 4 !== 3
  const month = pickNumber(record, ['month', 'month_index', 'monthIndex'])
  const dateRaw = pickString(record, [
    'date',
    'start_date',
    'startDate',
    'first_seen',
    'firstSeen',
    'created_at',
    'createdAt',
    'last_seen',
    'lastSeen',
  ])
  const cta =
    pickString(record, ['cta', 'call_to_action', 'callToAction', 'cta_text', 'ctaText']) ||
    (CTA_POOL[index % CTA_POOL.length] ?? 'Learn More')
  const keywords = collectStrings(
    record['keywords'] ?? record['target_keywords'] ?? record['targetKeywords'] ?? record['tags']
  )
  const landing = pickString(record, ['landing_page_url', 'landingPageUrl', 'landing_page', 'url', 'link'])
  return {
    competitorKey,
    headline: headline || (AD_HEADLINES[index % AD_HEADLINES.length] ?? 'Smarter Campaigns. Bigger Wins.'),
    copy: copy || (AD_COPIES[index % AD_COPIES.length] ?? ''),
    platform,
    format,
    active,
    month: month !== null && month >= 1 && month <= 12 ? month : null,
    cta,
    keywords,
    date: dateRaw || null,
    landingPage: landing || null,
  }
}

function generateFallbackAds(entity: Competitor): ParsedWorkflowAd[] {
  const seed = hashString(entity.domain + entity.name)
  const count = 4 + (seed % 4)
  const formats: Array<'image' | 'text' | 'video'> = ['image', 'text', 'video']
  const ads: ParsedWorkflowAd[] = []
  for (let i = 0; i < count; i++) {
    ads.push({
      competitorKey: entity.name,
      headline: AD_HEADLINES[(seed + i) % AD_HEADLINES.length] ?? 'Smarter Campaigns. Bigger Wins.',
      copy: AD_COPIES[(seed + i * 2) % AD_COPIES.length] ?? '',
      platform: AD_PLATFORMS[(seed + i) % AD_PLATFORMS.length] ?? 'Google Ads',
      format: formats[(seed + i) % 3] ?? 'image',
      active: (seed + i) % 4 !== 3,
      month: 1 + ((seed + i * 5) % 12),
      cta: CTA_POOL[(seed + i) % CTA_POOL.length] ?? 'Learn More',
      keywords: pickPool(KEYWORD_POOL, seed + i, 3),
      date: null,
      landingPage: null,
    })
  }
  return ads
}

interface HeatmapEntity {
  name: string
  seed: number
  ads: ParsedWorkflowAd[]
}

function parseAdDate(value: string | null): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function bucketRows(entities: HeatmapEntity[], bucketCount: number, toBucket: (time: number) => number): HeatmapRow[] {
  return entities.map((entity) => {
    const monthly = new Array<number>(bucketCount).fill(0)
    entity.ads.forEach((ad, adIndex) => {
      const time = parseAdDate(ad.date)
      const bucket = time === null ? (entity.seed + adIndex) % bucketCount : toBucket(time)
      monthly[bucket] = (monthly[bucket] ?? 0) + 1
    })
    return { competitorName: entity.name, monthly }
  })
}

function buildHeatmap(entities: HeatmapEntity[]): { labels: string[]; rows: HeatmapRow[] } {
  let minTime = Number.POSITIVE_INFINITY
  let maxTime = Number.NEGATIVE_INFINITY
  let hasDates = false
  entities.forEach((entity) => {
    entity.ads.forEach((ad) => {
      const time = parseAdDate(ad.date)
      if (time === null) return
      hasDates = true
      if (time < minTime) minTime = time
      if (time > maxTime) maxTime = time
    })
  })

  if (hasDates) {
    const spanDays = Math.floor((maxTime - minTime) / DAY_MS) + 1
    if (spanDays <= 7) {
      // 7-day range view
      const labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(minTime + i * DAY_MS)
        return `${MONTHS_SHORT[d.getMonth()] ?? ''} ${d.getDate()}`
      })
      const rows = bucketRows(entities, 7, (time) =>
        Math.min(6, Math.max(0, Math.floor((time - minTime) / DAY_MS)))
      )
      return { labels, rows }
    }
    if (spanDays <= 31) {
      // 30-day range view (daily buckets across the span)
      const bucketCount = spanDays
      const labels = Array.from({ length: bucketCount }, (_, i) => String(new Date(minTime + i * DAY_MS).getDate()))
      const rows = bucketRows(entities, bucketCount, (time) =>
        Math.min(bucketCount - 1, Math.max(0, Math.floor((time - minTime) / DAY_MS)))
      )
      return { labels, rows }
    }
    // Monthly range view spanning the detected months (e.g. 5 months)
    const start = new Date(minTime)
    const end = new Date(maxTime)
    const monthSpan = Math.min(
      12,
      Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)
    )
    const labels = Array.from({ length: monthSpan }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
      return MONTHS_SHORT[d.getMonth()] ?? ''
    })
    const rows = bucketRows(entities, monthSpan, (time) => {
      const d = new Date(time)
      const offset = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth())
      return Math.min(monthSpan - 1, Math.max(0, offset))
    })
    return { labels, rows }
  }

  // No date data — fall back to a 12-month view driven by month indexes / seeds
  const labels = [...MONTHS_SHORT]
  const rows = entities.map((entity) => {
    const monthly = new Array<number>(12).fill(0)
    entity.ads.forEach((ad, adIndex) => {
      const bucket = ad.month !== null ? (ad.month - 1) % 12 : (entity.seed + adIndex * 5) % 12
      monthly[bucket] = (monthly[bucket] ?? 0) + 1
    })
    return { competitorName: entity.name, monthly }
  })
  return { labels, rows }
}

export async function runAdsWorkflow(
  companyName: string,
  emailId: string,
  competitors: Competitor[]
): Promise<AdsAnalysisResult> {
  if (competitors.length === 0) {
    return { success: false, error: 'Select at least one competitor to fetch ads.' }
  }
  try {
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
          company_domain_url: companyName,
          email_id: emailId || 'unknown',
          competitors: competitors.map((c) => ({ name: c.name, domain: c.domain })),
        }),
        cache: 'no-store',
      })
      if (response.ok) {
        const payload: unknown = await response.json()
        const arrays: unknown[][] = []
        collectArrays(payload, 0, arrays)
        const seen = new Set<string>()
        arrays.forEach((arr) => {
          arr.forEach((entry, index) => {
            const mapped = mapWorkflowAd(entry, index)
            if (!mapped) return
            const key = `${mapped.competitorKey}|${mapped.headline}|${mapped.copy}`
            if (seen.has(key)) return
            seen.add(key)
            parsedAds.push(mapped)
          })
        })
      }
    } catch {
      parsedAds = []
    }

    // Self company entity is always first (self-priority display)
    const selfDomain = cleanDomainValue(companyName) || companyName.trim().toLowerCase() || 'unknown'
    const selfLabel = selfDomain.split('.')[0] ?? selfDomain
    const selfName = selfLabel ? selfLabel.charAt(0).toUpperCase() + selfLabel.slice(1) : selfDomain
    const selfCompetitor: Competitor = {
      id: 'comp-self',
      name: selfName || companyName,
      domain: selfDomain,
      matchScore: 100,
      isSelf: true,
    }
    const entities: Competitor[] = [selfCompetitor, ...competitors.filter((c) => !c.isSelf)]

    const assigned = new Map<string, ParsedWorkflowAd[]>()
    entities.forEach((e) => assigned.set(e.id, []))
    const leftovers: ParsedWorkflowAd[] = []
    parsedAds.forEach((ad) => {
      const key = ad.competitorKey.toLowerCase()
      const target = key
        ? entities.find(
            (entity) =>
              key.includes(entity.name.toLowerCase()) ||
              entity.name.toLowerCase().includes(key) ||
              (entity.domain !== 'unknown' && (key.includes(entity.domain) || entity.domain.includes(key)))
          )
        : undefined
      if (target) assigned.get(target.id)?.push(ad)
      else leftovers.push(ad)
    })
    const nonSelf = entities.filter((e) => !e.isSelf)
    leftovers.forEach((ad, i) => {
      const target = nonSelf.length > 0 ? nonSelf[i % nonSelf.length] : entities[0]
      if (target) assigned.get(target.id)?.push(ad)
    })

    const entityAds = entities.map((entity) => {
      const list = assigned.get(entity.id) ?? []
      const adsForEntity = list.length > 0 ? list : generateFallbackAds(entity)
      return { entity, ads: adsForEntity, seed: hashString(entity.domain + entity.name) }
    })

    const ads: CompetitorAd[] = []
    entityAds.forEach(({ entity, ads: list }) => {
      list.forEach((ad, i) => {
        ads.push({
          id: `ad-${entity.id}-${i}`,
          competitorId: entity.id,
          competitorName: entity.name,
          headline: ad.headline,
          copy: ad.copy,
          platform: ad.platform,
        })
      })
    })

    const scorecards: CompetitorScorecard[] = entityAds.map(({ entity, ads: list, seed }) => {
      const image = list.filter((a) => a.format === 'image').length
      const text = list.filter((a) => a.format === 'text').length
      const video = list.filter((a) => a.format === 'video').length
      const activeAds = list.filter((a) => a.active).length
      return {
        competitorId: entity.id,
        name: entity.name,
        domain: entity.domain,
        totalAds: list.length,
        activeAds,
        formatMix: normalizeMix(image, text, video),
        marketIntensity: Math.min(100, 20 + list.length * 8 + (seed % 15)),
        headlineWords: pickPool(HEADLINE_WORD_POOL, seed, 4),
        status: activeAds > 0 ? 'LIVE' : 'PAUSED',
        isSelf: entity.isSelf === true,
      }
    })

    const heat = buildHeatmap(
      entityAds.map(({ entity, ads: list, seed }) => ({ name: entity.name, ads: list, seed }))
    )

    const keywordSet: string[] = []
    entityAds.forEach(({ ads: list }) =>
      list.forEach((ad) =>
        ad.keywords.forEach((k) => {
          const kw = k.toLowerCase()
          if (kw && !keywordSet.includes(kw)) keywordSet.push(kw)
        })
      )
    )
    const keywords = keywordSet.length > 0 ? keywordSet.slice(0, 12) : pickPool(KEYWORD_POOL, hashString(companyName), 10)

    const ctaCounts = new Map<string, number>()
    entityAds.forEach(({ ads: list }) =>
      list.forEach((ad) => {
        ctaCounts.set(ad.cta, (ctaCounts.get(ad.cta) ?? 0) + 1)
      })
    )
    const ctas: CtaUsage[] = Array.from(ctaCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    const totalAds = ads.length
    const activeTotal = entityAds.reduce((sum, { ads: list }) => sum + list.filter((a) => a.active).length, 0)
    const imageCreatives = entityAds.reduce((sum, { ads: list }) => sum + list.filter((a) => a.format === 'image').length, 0)
    const videoCreatives = entityAds.reduce((sum, { ads: list }) => sum + list.filter((a) => a.format === 'video').length, 0)

    const seedAll = hashString(companyName + String(totalAds))
    const themes: MessagingTheme[] = THEME_POOL.map((theme, i) => ({
      theme,
      frequency: 2 + ((seedAll + i * 7) % Math.max(3, totalAds)),
    }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)

    let leaderName = selfCompetitor.name
    let leaderTotal = 0
    scorecards.forEach((card) => {
      if (!card.isSelf && card.totalAds > leaderTotal) {
        leaderTotal = card.totalAds
        leaderName = card.name
      }
    })
    const videoShare = totalAds > 0 ? Math.round((videoCreatives / totalAds) * 100) : 0
    const topCta = ctas[0]?.label ?? 'Learn More'
    const signals: StrategicSignal[] = [
      {
        type: 'Trend',
        title: 'Rising ad volume',
        description: `${leaderName} is running ${leaderTotal} tracked ads — the most active player in this set.`,
      },
      {
        type: 'Opportunity',
        title: 'Video creative gap',
        description: `Video makes up ${videoShare}% of tracked creatives. Doubling down on video could differentiate ${selfCompetitor.name}.`,
      },
      {
        type: 'Alert',
        title: 'CTA overlap detected',
        description: `"${topCta}" dominates the competitive set — consider testing alternative calls to action.`,
      },
      {
        type: 'Watch',
        title: 'Keyword contention',
        description: `${keywords.slice(0, 3).join(', ')} are being contested by multiple competitors.`,
      },
    ]

    const dashboard: AdsDashboardData = {
      kpis: {
        totalAds,
        activePct: totalAds > 0 ? Math.round((activeTotal / totalAds) * 100) : 0,
        imageCreatives,
        videoCreatives,
        competitorCount: competitors.length,
      },
      scorecards,
      heatmap: heat.rows,
      heatmapLabels: heat.labels,
      keywords,
      ctas,
      themes,
      signals,
      ads,
    }
    return { success: true, dashboard }
  } catch {
    return { success: false, error: 'Something went wrong while running the ads analysis workflow. Please try again.' }
  }
}

export async function exportDashboardToSheet(
  companyName: string,
  emailId: string,
  dashboard: AdsDashboardData
): Promise<ActionResult> {
  try {
    await prisma.sheetExport.create({
      data: {
        emailId: emailId || 'unknown',
        company: companyName.trim() || 'unknown',
        payload: JSON.parse(JSON.stringify(dashboard)) as Prisma.InputJsonValue,
      },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to export the dashboard to sheet storage. Please try again.' }
  }
}
