'use server'

import { isStoredTransparencyUrl, splitIntelItems } from '@/lib/ad-display'
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
const COL_IMAGE = 13
const COL_VIDEO = 14
const COL_THUMB = 15
const COL_MEDIA_EXTRA = 16
const COL_REGION = 17
const COL_START_DATE = 19
const COL_END_DATE = 20
const COL_STATUS = 22
const COL_VALUE_PROPS = 23
const COL_OFFER = 24
const COL_SERVICES = 25
const COL_KEYWORDS = 26
const COL_ABOUT = 29
const COL_SERVICES_ALT = 30
const COL_PRICING = 31
const COL_AUDIENCE = 32

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* Previous fix: the analysis window is restricted to the last 6 months. */
const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000

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

function stringifyCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '[object Object]' || trimmed === 'null' || trimmed === 'undefined') {
      return ''
    }
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (parsed !== null && typeof parsed !== 'string') {
          const nested = stringifyCell(parsed)
          if (nested) return nested
        }
      } catch {
        // keep the original string
      }
    }
    return trimmed
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map(stringifyCell).filter(Boolean).join('; ')
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['text', 'value', 'name', 'label', 'description', 'content', 'summary', 'about']) {
      const inner = stringifyCell(record[key])
      if (inner) return inner
    }
    return Object.values(record).map(stringifyCell).filter(Boolean).join('; ')
  }
  return ''
}

function cell(row: unknown[], index: number): string {
  return stringifyCell(row[index])
}

function firstMeaningful(...values: string[]): string {
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    if (/^untitled(\s+ad)?$/i.test(trimmed)) continue
    return trimmed
  }
  return ''
}

function splitUrls(raw: string): string[] {
  const normalized = raw.replace(/%20/gi, ' ')
  return normalized
    .split(/[,|\s]+/)
    .map((part) => part.trim())
    .filter((part) => /^https?:\/\//i.test(part))
}

function extractSimgadUrls(raw: string): string[] {
  const matches = [...raw.replace(/%20/gi, ' ').matchAll(/tpc\.googlesyndication\.com\/archive\/simgad\/(\d+)/gi)]
  const seen = new Set<string>()
  const urls: string[] = []
  for (const match of matches) {
    const id = match[1]
    if (!id || seen.has(id)) continue
    seen.add(id)
    urls.push(`https://tpc.googlesyndication.com/archive/simgad/${id}`)
  }
  return urls
}

function isVideoUrl(url: string): boolean {
  return (
    /\.(mp4|webm|mov)(\?|$)/i.test(url) ||
    /\/video|fbcdn\.net\/.*\.mp4|googlevideo|youtube|youtu\.be|vimeo/i.test(url)
  )
}

function findUrlInRow(row: unknown[], test: (url: string) => boolean): string {
  for (let index = 0; index < row.length; index += 1) {
    const raw = cell(row, index)
    const urls = [
      ...extractSimgadUrls(raw),
      ...splitUrls(raw),
      ...[...raw.replace(/%20/gi, ' ').matchAll(/https?:\/\/[^\s"'<>\\]+/gi)].map((match) =>
        match[0].replace(/[),.;]+$/, '')
      ),
    ]
    for (const url of urls) {
      if (test(url)) return url
    }
  }
  return ''
}

function collectMedia(row: unknown[]): { images: string[]; videos: string[] } {
  const urls = [COL_IMAGE, COL_VIDEO, COL_THUMB, COL_MEDIA_EXTRA].flatMap((index) => {
    const raw = cell(row, index)
    return [...extractSimgadUrls(raw), ...splitUrls(raw)]
  })
  const seen = new Set<string>()
  const images: string[] = []
  const videos: string[] = []
  for (const url of urls) {
    if (seen.has(url)) continue
    seen.add(url)
    if (isVideoUrl(url)) videos.push(url)
    else images.push(url)
  }
  return { images, videos }
}

function deriveFormat(creativeType: string): AdFormat {
  const upper = creativeType.toUpperCase()
  if (upper.includes('VIDEO')) return 'video'
  if (upper.includes('IMAGE') || upper.includes('DCO') || upper.includes('CAROUSEL')) return 'image'
  return 'text'
}

function isCreativeActive(status: string): boolean {
  const value = status.trim().toLowerCase()
  if (!value) return true
  if (/(paused|inactive|disabled|ended|stopped|removed|disapproved|archived)/.test(value)) {
    return false
  }
  return true
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
    const companyDomain = cleanDomainValue(companyName)
    const companyLabel = companyDomain.split('.')[0] ?? ''

    records.forEach((record, recordIndex) => {
      const rows = extractCreativeRows(record)
      rows.forEach((row, rowIndex) => {
        const rowDomain = cleanDomainValue(cell(row, COL_DOMAIN))
        const rowName = cell(row, COL_NAME)
        const isSelfRow = rowName.toLowerCase() === 'self'
        const matched = isSelfRow
          ? undefined
          : byDomain.get(rowDomain) ?? byName.get(rowName.toLowerCase())
        const competitorId = matched
          ? matched.id
          : `comp-db-${rowDomain || rowName.toLowerCase() || String(recordIndex)}`
        const competitorName = matched ? matched.name : rowName || rowDomain || 'Unknown'
        domainById.set(competitorId, matched ? matched.domain : rowDomain)
        const isSelf =
          isSelfRow ||
          (!matched &&
            ((companyDomain.length > 0 && rowDomain === companyDomain) ||
              (companyLabel.length > 0 &&
                (rowName.toLowerCase() === companyLabel || rowName.toLowerCase() === companyDomain))))

        const format = deriveFormat(cell(row, COL_CREATIVE_TYPE))
        const formatLabel = format === 'video' ? 'Video Ad' : format === 'image' ? 'Image Ad' : 'Text Ad'
        const rawCopy = cell(row, COL_COPY)
        const messagingAngles = splitIntelItems(cell(row, COL_VALUE_PROPS))
        const services = [
          ...splitIntelItems(cell(row, COL_SERVICES)),
          ...splitIntelItems(cell(row, COL_SERVICES_ALT)),
        ].filter((item, index, list) => list.indexOf(item) === index)
        const headline =
          firstMeaningful(
            cell(row, COL_HEADLINE),
            cell(row, COL_SUBHEADLINE),
            rawCopy.slice(0, 80),
            cell(row, COL_CTA),
            messagingAngles[0] ?? ''
          ) || `${competitorName} ${formatLabel}`
        const copy = firstMeaningful(rawCopy, cell(row, COL_SUBHEADLINE))
        const cta = cell(row, COL_CTA)
        const { images, videos } = collectMedia(row)
        const landingRaw = cell(row, COL_LANDING_PAGE)
        const adUrlCandidate = findUrlInRow(row, isStoredTransparencyUrl)
        const keywords = splitIntelItems(cell(row, COL_KEYWORDS))
        const offer = cell(row, COL_OFFER)
        if (offer) themeCounts.set(offer, (themeCounts.get(offer) ?? 0) + 1)
        const status = cell(row, COL_STATUS)
        const active = isCreativeActive(status)
        const startDate = cell(row, COL_START_DATE)
        const endDate = cell(row, COL_END_DATE)
        const dateValue = endDate || startDate
        const parsedDate = dateValue ? new Date(dateValue) : null
        const date =
          parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined

        ads.push({
          id: `ad-${competitorId}-${recordIndex}-${rowIndex}`,
          competitorId,
          competitorName,
          headline,
          copy,
          platform: derivePlatform(cell(row, COL_PLATFORM)),
          format,
          active,
          date,
          cta: cta || undefined,
          landingPage: landingRaw || undefined,
          keywords,
          isSelf,
          externalAdId: cell(row, COL_AD_ID) || undefined,
          imageUrl: images[0] || undefined,
          adUrl: adUrlCandidate || undefined,
          images,
          videos,
          region: cell(row, COL_REGION) || undefined,
          lastShown: endDate || undefined,
          valueProposition: cell(row, COL_VALUE_PROPS) || undefined,
          services,
          pricing: cell(row, COL_PRICING) || undefined,
          audience: cell(row, COL_AUDIENCE) || undefined,
          about: cell(row, COL_ABOUT) || undefined,
          messagingAngles,
        })
      })
    })

    if (ads.length === 0) {
      return {
        success: false,
        error: 'No ads data was found yet for this analysis. Please try again in a moment.',
      }
    }

    // Keep the 6-month date restriction: dated creatives older than 6 months
    // are excluded. Undated creatives are always kept. If the filter would
    // remove everything, fall back to the full set so the dashboard never
    // renders empty when the DB has rows.
    const sixMonthsAgo = Date.now() - SIX_MONTHS_MS
    const recentAds = ads.filter((ad) => {
      if (!ad.date) return true
      const time = new Date(ad.date).getTime()
      return Number.isNaN(time) || time >= sixMonthsAgo
    })
    const finalAds = recentAds.length > 0 ? recentAds : ads

    finalAds.forEach((ad) => {
      ;(ad.keywords ?? []).forEach((keyword) => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1)
      })
    })

    const grouped = new Map<string, CompetitorAd[]>()
    finalAds.forEach((ad) => {
      const list = grouped.get(ad.competitorId) ?? []
      list.push(ad)
      grouped.set(ad.competitorId, list)
    })
    const maxAdsPerCompetitor = Math.max(1, ...Array.from(grouped.values()).map((list) => list.length))

    const scorecards: CompetitorScorecard[] = Array.from(grouped.entries()).map(
      ([competitorId, list]) => {
        const first = list[0]
        const imageCount = list.filter((ad) => ad.format === 'image').length
        const textCount = list.filter((ad) => ad.format === 'text').length
        const videoCount = list.filter((ad) => ad.format === 'video').length
        const activeAds = list.filter((ad) => ad.active ?? true).length
        const wordCounts = new Map<string, number>()
        list.forEach((ad) => {
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
          .map(([word]) => word)
        return {
          competitorId,
          name: first ? first.competitorName : 'Unknown',
          domain: domainById.get(competitorId) ?? '',
          totalAds: list.length,
          activeAds,
          formatMix: normalizeMix(imageCount, textCount, videoCount),
          marketIntensity: Math.min(
            100,
            Math.max(1, Math.round((list.length / maxAdsPerCompetitor) * 100))
          ),
          headlineWords,
          status: activeAds > 0 ? ('LIVE' as const) : ('PAUSED' as const),
          isSelf: first ? first.isSelf === true : false,
        }
      }
    )

    /* Heatmap with a dynamic date range: daily buckets for short spans, monthly otherwise. */
    const dated = finalAds
      .map((ad) => ({ ad, time: ad.date ? new Date(ad.date).getTime() : NaN }))
      .filter((entry) => Number.isFinite(entry.time))
    let heatmapLabels: string[] = MONTHS_SHORT
    const heatmap: HeatmapRow[] = []
    if (dated.length > 0) {
      const minTime = Math.min(...dated.map((entry) => entry.time))
      const maxTime = Math.max(...dated.map((entry) => entry.time))
      const dayMs = 24 * 60 * 60 * 1000
      const spanDays = Math.max(1, Math.ceil((maxTime - minTime) / dayMs) + 1)
      if (spanDays <= 31) {
        const bucketCount = spanDays
        heatmapLabels = Array.from({ length: bucketCount }, (_, i) => {
          const d = new Date(minTime + i * dayMs)
          return `${MONTHS_SHORT[d.getUTCMonth()] ?? ''} ${d.getUTCDate()}`
        })
        scorecards.forEach((card) => {
          const buckets = new Array<number>(bucketCount).fill(0)
          dated.forEach((entry) => {
            if (entry.ad.competitorId !== card.competitorId) return
            const idx = Math.min(bucketCount - 1, Math.floor((entry.time - minTime) / dayMs))
            buckets[idx] = (buckets[idx] ?? 0) + 1
          })
          heatmap.push({ competitorName: card.name, monthly: buckets })
        })
      } else {
        const buckets: Array<{ year: number; month: number }> = []
        const start = new Date(minTime)
        let year = start.getUTCFullYear()
        let month = start.getUTCMonth()
        const end = new Date(maxTime)
        const endKey = end.getUTCFullYear() * 12 + end.getUTCMonth()
        while (year * 12 + month <= endKey && buckets.length < 12) {
          buckets.push({ year, month })
          month += 1
          if (month > 11) {
            month = 0
            year += 1
          }
        }
        heatmapLabels = buckets.map((bucket) => MONTHS_SHORT[bucket.month] ?? '')
        scorecards.forEach((card) => {
          const counts = new Array<number>(buckets.length).fill(0)
          dated.forEach((entry) => {
            if (entry.ad.competitorId !== card.competitorId) return
            const d = new Date(entry.time)
            const idx = buckets.findIndex(
              (bucket) => bucket.year === d.getUTCFullYear() && bucket.month === d.getUTCMonth()
            )
            if (idx >= 0) counts[idx] = (counts[idx] ?? 0) + 1
          })
          heatmap.push({ competitorName: card.name, monthly: counts })
        })
      }
    } else {
      scorecards.forEach((card) => {
        heatmap.push({ competitorName: card.name, monthly: new Array<number>(12).fill(0) })
      })
    }

    const keywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword]) => keyword)

    const ctaCounts = new Map<string, number>()
    finalAds.forEach((ad) => {
      const cta = ad.cta?.trim()
      if (cta) ctaCounts.set(cta, (ctaCounts.get(cta) ?? 0) + 1)
    })
    const ctas: CtaUsage[] = Array.from(ctaCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    if (themeCounts.size === 0) {
      finalAds.forEach((ad) => {
        ;(ad.messagingAngles ?? []).slice(0, 1).forEach((angle) => {
          themeCounts.set(angle, (themeCounts.get(angle) ?? 0) + 1)
        })
      })
    }
    const themes: MessagingTheme[] = Array.from(themeCounts.entries())
      .map(([theme, frequency]) => ({ theme, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 6)

    const signals: StrategicSignal[] = []
    const leader = [...scorecards]
      .filter((card) => !card.isSelf)
      .sort((a, b) => b.totalAds - a.totalAds)[0]
    if (leader) {
      signals.push({
        type: 'Trend',
        title: `${leader.name} leads ad volume`,
        description: `${leader.name} is running ${leader.totalAds} tracked ads (${leader.activeAds} active) — the largest footprint in this competitive set.`,
      })
    }
    const videoHeavy = scorecards.find((card) => card.formatMix.video >= 40)
    if (videoHeavy) {
      signals.push({
        type: 'Watch',
        title: `${videoHeavy.name} is investing in video`,
        description: `${videoHeavy.formatMix.video}% of ${videoHeavy.name}'s creatives are video — monitor their video messaging closely.`,
      })
    }
    if (keywords.length > 0) {
      signals.push({
        type: 'Opportunity',
        title: `Contested keyword: "${keywords[0]}"`,
        description: `"${keywords[0]}" appears most often across the tracked creatives — a strong candidate for counter-positioning in your own ads.`,
      })
    }
    const paused = scorecards.find((card) => card.status === 'PAUSED' && !card.isSelf)
    if (paused) {
      signals.push({
        type: 'Alert',
        title: `${paused.name} has paused all ads`,
        description: `None of ${paused.name}'s ${paused.totalAds} tracked ads are currently active — watch for a relaunch or strategy shift.`,
      })
    }

    const activeCount = finalAds.filter((ad) => ad.active ?? true).length
    const dashboard: AdsDashboardData = {
      kpis: {
        totalAds: finalAds.length,
        activePct: finalAds.length > 0 ? Math.round((activeCount / finalAds.length) * 100) : 0,
        imageCreatives: finalAds.filter((ad) => ad.format === 'image').length,
        videoCreatives: finalAds.filter((ad) => ad.format === 'video').length,
        competitorCount: scorecards.filter((card) => !card.isSelf).length,
      },
      scorecards,
      heatmap,
      heatmapLabels,
      keywords,
      ctas,
      themes,
      signals,
      ads: finalAds,
    }
    return { success: true, dashboard }
  } catch {
    return {
      success: false,
      error: 'Unable to reach the dashboard service. Please check your connection and try again.',
    }
  }
}
