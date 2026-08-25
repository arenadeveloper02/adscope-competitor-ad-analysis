'use server'

import type {
  AdFormat,
  AdPlatform,
  AdsAnalysisResult,
  AdsDashboardData,
  Competitor,
  CompetitorAd,
  CompetitorScorecard,
  CtaUsage,
  FormatMix,
  HeatmapRow,
  MessagingTheme,
  StrategicSignal,
} from '@/lib/types'

/**
 * DB-backed dashboard workflow (Competitor Intelligence Agent Get). After the
 * Final (trigger) workflow finishes, this endpoint returns the scraped
 * creatives for the user's email + company from Postgres. Payload keys MUST be
 * exactly { email, company_name }.
 */
const DASHBOARD_WORKFLOW_ENDPOINT =
  'https://agent.thearena.ai/api/workflows/44a45367-2ae0-406f-b745-6b2e2bef52fe/execute'

const DASHBOARD_WORKFLOW_API_KEY = 'sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-'

/* Column layout of each creative row inside record.output.rows (stringified array of arrays) */
const COL_DOMAIN = 0
const COL_NAME = 1
const COL_AD_ID = 3
const COL_CREATIVE_TYPE = 4
const COL_PLATFORM = 5
const COL_HEADLINE = 6
const COL_SUBHEADLINE = 7
const COL_COPY = 8
const COL_CTA = 9
const COL_LANDING_PAGE = 12
const COL_START_DATE = 19
const COL_STATUS = 22
const COL_VALUE_PROPS = 23
const COL_KEYWORDS = 26

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'your', 'you', 'our', 'that', 'this', 'from', 'are',
  'has', 'have', 'more', 'into', 'can', 'get', 'its', 'new', 'now', 'all', 'out', 'here',
])

function cleanDomainValue(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

function cell(row: unknown[], index: number): string {
  const value = row[index]
  return typeof value === 'string' ? value.trim() : ''
}

function deriveFormat(creativeType: string): AdFormat {
  const upper = creativeType.toUpperCase()
  if (upper.includes('VIDEO')) return 'video'
  if (upper.includes('IMAGE') || upper.includes('DCO') || upper.includes('CAROUSEL')) return 'image'
  return 'text'
}

function derivePlatform(raw: string): AdPlatform {
  const lower = raw.toLowerCase()
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'Meta'
  if (lower.includes('linkedin')) return 'LinkedIn'
  if (lower.includes('tiktok')) return 'TikTok'
  return 'Google Ads'
}

function normalizeMix(image: number, text: number, video: number): FormatMix {
  const total = image + text + video
  if (total <= 0) return { image: 34, text: 33, video: 33 }
  const i = Math.round((image / total) * 100)
  const v = Math.round((video / total) * 100)
  return { image: i, video: v, text: Math.max(0, 100 - i - v) }
}

function isRecordWithOutput(entry: unknown): entry is Record<string, unknown> {
  return typeof entry === 'object' && entry !== null && 'output' in (entry as Record<string, unknown>)
}

function extractRecords(payload: unknown): Array<Record<string, unknown>> {
  if (typeof payload !== 'object' || payload === null) return []
  const output = (payload as Record<string, unknown>).output
  if (typeof output !== 'object' || output === null) return []
  const outputRecord = output as Record<string, unknown>
  const candidates: unknown[] = [outputRecord.rows, outputRecord['postgresql1.rows']]
  for (const nested of Object.values(outputRecord)) {
    candidates.push(nested)
  }
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const records = candidate.filter(isRecordWithOutput)
      if (records.length > 0) return records
    }
    if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
      const rows = (candidate as Record<string, unknown>).rows
      if (Array.isArray(rows)) {
        const records = rows.filter(isRecordWithOutput)
        if (records.length > 0) return records
      }
    }
  }
  return []
}

function extractCreativeRows(record: Record<string, unknown>): unknown[][] {
  const out = record.output
  if (typeof out !== 'object' || out === null) return []
  const rows = (out as Record<string, unknown>).rows
  let parsed: unknown = rows
  if (typeof rows === 'string') {
    try {
      parsed = JSON.parse(rows)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((r): r is unknown[] => Array.isArray(r))
}

/**
 * Fetches the dashboard dataset produced by the ads workflow for this email
 * and company, then maps it into the AdsDashboardData shape used across the UI.
 * The Get workflow expects exactly { email, company_name } — different keys
 * from the Final (trigger) workflow.
 */
export async function fetchDashboardData(
  emailId: string,
  companyName: string,
  selectedCompetitors: Competitor[]
): Promise<AdsAnalysisResult> {
  try {
    const response = await fetch(DASHBOARD_WORKFLOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DASHBOARD_WORKFLOW_API_KEY,
      },
      body: JSON.stringify({
        email: emailId,
        company_name: companyName,
      }),
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        success: false,
        error: `The dashboard service returned an error (status ${response.status}). Please try again in a moment.`,
      }
    }
    const payload: unknown = await response.json()
    const records = extractRecords(payload)
    if (records.length === 0) {
      return {
        success: false,
        error: 'No ads data was found yet for this analysis. Please try again in a moment.',
      }
    }

    const byDomain = new Map<string, Competitor>()
    const byName = new Map<string, Competitor>()
    selectedCompetitors.forEach((comp) => {
      byDomain.set(cleanDomainValue(comp.domain), comp)
      byName.set(comp.name.trim().toLowerCase(), comp)
    })

    const ads: CompetitorAd[] = []
    const keywordCounts = new Map<string, number>()
    const themeCounts = new Map<string, number>()
    const domainById = new Map<string, string>()

    records.forEach((record, recordIndex) => {
      const rows = extractCreativeRows(record)
      rows.forEach((row, rowIndex) => {
        const rowDomain = cleanDomainValue(cell(row, COL_DOMAIN))
        const rowName = cell(row, COL_NAME)
        const matched = byDomain.get(rowDomain) ?? byName.get(rowName.toLowerCase())
        const competitorId = matched
          ? matched.id
          : `comp-db-${rowDomain || rowName.toLowerCase() || String(recordIndex)}`
        const competitorName = matched ? matched.name : rowName || rowDomain || 'Unknown'
        domainById.set(competitorId, matched ? matched.domain : rowDomain)

        const headline =
          cell(row, COL_HEADLINE) ||
          cell(row, COL_SUBHEADLINE) ||
          cell(row, COL_COPY).slice(0, 80) ||
          'Untitled ad'
        const copy = cell(row, COL_COPY) || cell(row, COL_SUBHEADLINE) || headline
        const adId = cell(row, COL_AD_ID) || `${recordIndex}-${rowIndex}`
        const status = cell(row, COL_STATUS).toLowerCase()
        const startDate = cell(row, COL_START_DATE)
        const cta = cell(row, COL_CTA)
        const landingPage = cell(row, COL_LANDING_PAGE)

        ads.push({
          id: `ad-${competitorId}-${adId}-${rowIndex}`,
          competitorId,
          competitorName,
          headline,
          copy,
          platform: derivePlatform(cell(row, COL_PLATFORM)),
          format: deriveFormat(cell(row, COL_CREATIVE_TYPE)),
          active: status ? status === 'active' : true,
          date: startDate || undefined,
          cta: cta || undefined,
          landingPage: landingPage || undefined,
        })

        cell(row, COL_KEYWORDS)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
          .forEach((k) => keywordCounts.set(k, (keywordCounts.get(k) ?? 0) + 1))
        cell(row, COL_VALUE_PROPS)
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1))
      })
    })

    if (ads.length === 0) {
      return {
        success: false,
        error: 'No ads were found for the selected competitors yet. Please try again in a moment.',
      }
    }

    const buckets = new Map<string, { competitorId: string; name: string; ads: CompetitorAd[] }>()
    ads.forEach((ad) => {
      const existing = buckets.get(ad.competitorId)
      if (existing) {
        existing.ads.push(ad)
        return
      }
      buckets.set(ad.competitorId, { competitorId: ad.competitorId, name: ad.competitorName, ads: [ad] })
    })

    const bucketList = Array.from(buckets.values())
    const maxTotal = Math.max(1, ...bucketList.map((b) => b.ads.length))

    const scorecards: CompetitorScorecard[] = bucketList.map((bucket) => {
      const totalAds = bucket.ads.length
      const activeAds = bucket.ads.filter((ad) => ad.active ?? true).length
      let image = 0
      let text = 0
      let video = 0
      bucket.ads.forEach((ad) => {
        if (ad.format === 'video') video += 1
        else if (ad.format === 'image') image += 1
        else text += 1
      })
      const wordCounts = new Map<string, number>()
      bucket.ads.forEach((ad) => {
        ad.headline
          .toLowerCase()
          .split(/[^a-z0-9+]+/)
          .forEach((word) => {
            if (word.length < 4 || STOP_WORDS.has(word)) return
            wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
          })
      })
      const headlineWords = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
      return {
        competitorId: bucket.competitorId,
        name: bucket.name,
        domain: domainById.get(bucket.competitorId) ?? '',
        totalAds,
        activeAds,
        formatMix: normalizeMix(image, text, video),
        marketIntensity: Math.min(100, Math.max(5, Math.round((totalAds / maxTotal) * 100))),
        headlineWords,
        status: activeAds > 0 ? 'LIVE' : 'PAUSED',
      }
    })

    const orderSet = new Set<number>()
    ads.forEach((ad) => {
      if (!ad.date) return
      const d = new Date(ad.date)
      if (Number.isNaN(d.getTime())) return
      orderSet.add(d.getFullYear() * 12 + d.getMonth())
    })
    const orders = Array.from(orderSet)
      .sort((a, b) => a - b)
      .slice(-8)

    let heatmap: HeatmapRow[]
    let heatmapLabels: string[] | undefined
    if (orders.length > 0) {
      heatmapLabels = orders.map((order) => MONTHS_SHORT[order % 12] ?? '')
      heatmap = bucketList.map((bucket) => {
        const monthly = orders.map(
          (order) =>
            bucket.ads.filter((ad) => {
              if (!ad.date) return false
              const d = new Date(ad.date)
              if (Number.isNaN(d.getTime())) return false
              return d.getFullYear() * 12 + d.getMonth() === order
            }).length
        )
        return { competitorName: bucket.name, monthly }
      })
    } else {
      heatmap = bucketList.map((bucket) => ({
        competitorName: bucket.name,
        monthly: new Array<number>(12).fill(0),
      }))
    }

    const keywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword]) => keyword)

    const ctaMap = new Map<string, number>()
    ads.forEach((ad) => {
      if (ad.cta) ctaMap.set(ad.cta, (ctaMap.get(ad.cta) ?? 0) + 1)
    })
    const ctas: CtaUsage[] = Array.from(ctaMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    const themes: MessagingTheme[] = Array.from(themeCounts.entries())
      .map(([theme, frequency]) => ({ theme, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 6)

    const totalAds = ads.length
    const activeCount = ads.filter((ad) => ad.active ?? true).length
    const imageCreatives = ads.filter((ad) => ad.format === 'image').length
    const videoCreatives = ads.filter((ad) => ad.format === 'video').length
    const activePct = totalAds > 0 ? Math.round((activeCount / totalAds) * 100) : 0

    const signals: StrategicSignal[] = []
    const leader = [...scorecards].sort((a, b) => b.totalAds - a.totalAds)[0]
    if (leader) {
      signals.push({
        type: 'Trend',
        title: `${leader.name} leads ad volume`,
        description: `${leader.name} is running ${leader.totalAds} tracked ads (${leader.activeAds} live) — the largest footprint in this competitive set.`,
      })
    }
    const videoHeavy = scorecards.find((s) => s.formatMix.video >= 40)
    if (videoHeavy) {
      signals.push({
        type: 'Alert',
        title: `${videoHeavy.name} is betting on video`,
        description: `Video makes up ${videoHeavy.formatMix.video}% of ${videoHeavy.name}'s creatives — monitor whether this channel shift gains traction.`,
      })
    } else {
      signals.push({
        type: 'Opportunity',
        title: 'Video creative gap',
        description: 'Video is a small share of tracked creatives across this set — a differentiated video push could stand out.',
      })
    }
    const topCta = ctas[0]
    if (topCta) {
      signals.push({
        type: 'Watch',
        title: `"${topCta.label}" dominates CTAs`,
        description: `"${topCta.label}" appears in ${topCta.count} tracked ads — testing an alternative call-to-action could differentiate your creatives.`,
      })
    }
    const quiet = scorecards.find((s) => s.status === 'PAUSED')
    if (quiet) {
      signals.push({
        type: 'Opportunity',
        title: `${quiet.name} has gone quiet`,
        description: `${quiet.name} has no live ads right now — an aggressive push could capture its audience share.`,
      })
    }

    const dashboard: AdsDashboardData = {
      kpis: {
        totalAds,
        activePct,
        imageCreatives,
        videoCreatives,
        competitorCount: scorecards.length,
      },
      scorecards,
      heatmap,
      heatmapLabels,
      keywords,
      ctas,
      themes,
      signals: signals.slice(0, 4),
      ads,
    }

    return { success: true, dashboard }
  } catch {
    return {
      success: false,
      error: 'Unable to reach the dashboard service. Please check your connection and try again.',
    }
  }
}
