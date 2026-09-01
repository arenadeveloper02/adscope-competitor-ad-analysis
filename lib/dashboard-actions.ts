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

function isSimgadUrl(url: string): boolean {
  return /^https?:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+\/?$/i.test(url)
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
            messagingAngles[0] ?? '',
            `${competitorName} ${formatLabel}`
          ) || `${competitorName} ${formatLabel}`
        const copy =
          firstMeaningful(rawCopy, cell(row, COL_SUBHEADLINE), messagingAngles[0] ?? '') || headline
        const adId = cell(row, COL_AD_ID) || `${recordIndex}-${rowIndex}`
        const status = cell(row, COL_STATUS).toLowerCase()
        const startDate = cell(row, COL_START_DATE)
        const cta = cell(row, COL_CTA)
        const landingPage = cell(row, COL_LANDING_PAGE)
        const media = collectMedia(row)
        const imageUrl =
          extractSimgadUrls(cell(row, COL_IMAGE))[0] ||
          findUrlInRow(row, isSimgadUrl) ||
          splitUrls(cell(row, COL_IMAGE)).find(isSimgadUrl) ||
          ''
        const adUrl = findUrlInRow(row, isStoredTransparencyUrl)
        const valueProposition = firstMeaningful(cell(row, COL_OFFER), messagingAngles.slice(0, 3).join('; '))
        const about = cell(row, COL_ABOUT)
        const pricing = cell(row, COL_PRICING)
        const audience = cell(row, COL_AUDIENCE)
        const region = cell(row, COL_REGION)
        const lastShown = cell(row, COL_END_DATE)

        // Per-ad keyword data from the Get response (used by Creative Analysis)
        const rowKeywords = splitIntelItems(cell(row, COL_KEYWORDS)).flatMap((item) =>
          item.includes(',') ? item.split(',').map((part) => part.trim()) : [item]
        ).filter((keyword) => keyword.length > 1 && keyword.length < 80)

        ads.push({
          id: `ad-${competitorId}-${adId}-${rowIndex}`,
          competitorId,
          competitorName,
          headline,
          copy,
          platform: derivePlatform(cell(row, COL_PLATFORM)),
          format,
          active: isCreativeActive(status),
          date: startDate || undefined,
          cta: cta || undefined,
          landingPage: landingPage || undefined,
          keywords: rowKeywords.length > 0 ? rowKeywords : undefined,
          isSelf,
          externalAdId: cell(row, COL_AD_ID) || undefined,
          imageUrl: imageUrl || undefined,
          adUrl: adUrl || undefined,
          images: media.images.length > 0 ? media.images : undefined,
          videos: media.videos.length > 0 ? media.videos : undefined,
          region: region || undefined,
          lastShown: lastShown || undefined,
          language: 'English',
          impressions: 'Not disclosed',
          valueProposition: valueProposition || undefined,
          services: services.length > 0 ? services : undefined,
          pricing: pricing || undefined,
          audience: audience || undefined,
          about: about || undefined,
          messagingAngles: messagingAngles.length > 0 ? messagingAngles : undefined,
        })

        rowKeywords.forEach((k) => keywordCounts.set(k, (keywordCounts.get(k) ?? 0) + 1))
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

    const signals: StrategicSignal[] = []
    const sortedBuckets = [...bucketList].sort((a, b) => b.ads.length - a.ads.length)
    const topBucket = sortedBuckets[0]
    if (topBucket) {
      signals.push({
        type: 'Trend',
        title: `${topBucket.name} leads ad volume`,
        description: `${topBucket.name} is running ${topBucket.ads.length} tracked ads — the largest footprint in this competitive set.`,
      })
    }
    if (videoCreatives / Math.max(1, totalAds) < 0.2) {
      signals.push({
        type: 'Opportunity',
        title: 'Video creatives are underused',
        description: `Only ${videoCreatives} of ${totalAds} tracked ads are video — investing in video could differentiate your creative mix.`,
      })
    }
    const topCtaUsage = ctas[0]
    if (topCtaUsage) {
      signals.push({
        type: 'Watch',
        title: `"${topCtaUsage.label}" dominates CTAs`,
        description: `The most common call-to-action across the tracked set is "${topCtaUsage.label}" (${topCtaUsage.count} ads).`,
      })
    }
    const pausedCompetitor = scorecards.find((s) => s.status === 'PAUSED')
    if (pausedCompetitor) {
      signals.push({
        type: 'Alert',
        title: `${pausedCompetitor.name} has paused its ads`,
        description: `${pausedCompetitor.name} currently has no live ads among its ${pausedCompetitor.totalAds} tracked creatives.`,
      })
    }

    const dashboard: AdsDashboardData = {
      kpis: {
        totalAds,
        activePct: totalAds > 0 ? Math.round((activeCount / totalAds) * 100) : 0,
        imageCreatives,
        videoCreatives,
        // Selected rivals only — never include the entered company (competitor_name = self).
        competitorCount: selectedCompetitors.length,
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
    return { success: true, dashboard }
  } catch {
    return {
      success: false,
      error: 'Unable to reach the dashboard service. Please check your connection and try again.',
    }
  }
}
