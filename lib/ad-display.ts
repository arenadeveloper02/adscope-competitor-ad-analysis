import type { AdFormat, CompetitorAd } from '@/lib/types'

const PLACEHOLDER_HEADLINE = /^untitled(\s+ad)?$/i

const REGION_NAMES: Record<string, string> = {
  US: 'United States',
  USA: 'United States',
  IN: 'India',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  AE: 'United Arab Emirates',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  SG: 'Singapore',
  NL: 'Netherlands',
  ES: 'Spain',
  IT: 'Italy',
  BR: 'Brazil',
  JP: 'Japan',
  KR: 'South Korea',
  MX: 'Mexico',
  ZA: 'South Africa',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  IE: 'Ireland',
  NZ: 'New Zealand',
  CH: 'Switzerland',
  AT: 'Austria',
  BE: 'Belgium',
  PL: 'Poland',
  PT: 'Portugal',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  PH: 'Philippines',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  HK: 'Hong Kong',
  TW: 'Taiwan',
}

export function isPlaceholderHeadline(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? ''
  return trimmed.length === 0 || PLACEHOLDER_HEADLINE.test(trimmed)
}

export function formatLabel(format: AdFormat | undefined): string {
  if (format === 'video') return 'Video Ad'
  if (format === 'image') return 'Image Ad'
  return 'Text Ad'
}

export function displayHeadline(ad: CompetitorAd): string {
  if (!isPlaceholderHeadline(ad.headline)) return ad.headline.trim()
  if (!isPlaceholderHeadline(ad.copy)) {
    const snippet = ad.copy.trim().slice(0, 80)
    return snippet.length < ad.copy.trim().length ? `${snippet.trim()}…` : snippet
  }
  const cta = ad.cta?.trim()
  if (cta) return cta
  const angle = ad.messagingAngles?.find((item) => item.trim().length > 0)
  if (angle) return angle.trim()
  return `${ad.competitorName} ${formatLabel(ad.format)}`
}

export function displayCopy(ad: CompetitorAd): string {
  const headline = displayHeadline(ad)
  const copy = ad.copy?.trim() ?? ''
  if (copy && !isPlaceholderHeadline(copy) && copy !== headline) return copy
  const sub = ad.messagingAngles?.find((item) => {
    const trimmed = item.trim()
    return trimmed.length > 0 && trimmed !== headline
  })
  return sub?.trim() ?? ''
}

function isNoiseIntel(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '[object Object]') return true
  if (/^https?:\/\//i.test(trimmed)) return true
  if (/tpc\.googlesyndication|adstransparency\.google|facebook\.com\/ads\/library/i.test(trimmed)) {
    return true
  }
  return PLACEHOLDER_HEADLINE.test(trimmed)
}

/** Splits workflow intelligence cells (plain text, numbered lists, or JSON arrays). */
export function splitIntelItems(raw: string | undefined | null): string[] {
  if (raw == null) return []
  const text = String(raw).trim()
  if (!text || isNoiseIntel(text)) return []
  if (
    (text.startsWith('[') && text.endsWith(']')) ||
    (text.startsWith('{') && text.endsWith('}'))
  ) {
    try {
      const parsed: unknown = JSON.parse(text)
      const nested = intelItemsFromUnknown(parsed)
      if (nested.length > 0) return nested
    } catch {
      // fall through to plain-text splitting
    }
  }
  const numbered = text
    .split(/\s*(?:\d+[.)]\s+)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isNoiseIntel(part))
  if (numbered.length > 1) return numbered
  const byBreak = text
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isNoiseIntel(part))
  if (byBreak.length > 1) return byBreak
  if (text.includes(',') && text.length > 80) {
    const byComma = text
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 2 && part.length < 140 && !isNoiseIntel(part))
    if (byComma.length > 1) return byComma
  }
  return [text]
}

export function intelItemsFromUnknown(value: unknown): string[] {
  if (value == null) return []
  if (typeof value === 'string') return splitIntelItems(value)
  if (typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim()
    return text && !isNoiseIntel(text) ? [text] : []
  }
  if (Array.isArray(value)) return value.flatMap(intelItemsFromUnknown)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['text', 'value', 'name', 'label', 'description', 'content', 'summary']) {
      const inner = intelItemsFromUnknown(record[key])
      if (inner.length > 0) return inner
    }
    return Object.values(record).flatMap(intelItemsFromUnknown)
  }
  return []
}

function uniqueIntel(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed || isNoiseIntel(trimmed)) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

/** Intelligence lists for the ad detail modal, using stored fields then on-ad copy. */
export function adIntelligence(ad: CompetitorAd): {
  messagingAngles: string[]
  valueProposition: string[]
  services: string[]
  pricing: string[]
  audience: string[]
  about: string
  keywords: string[]
} {
  const genericTitle = `${ad.competitorName} ${formatLabel(ad.format)}`
  const storedAngles = uniqueIntel(intelItemsFromUnknown(ad.messagingAngles))
  const storedValue = uniqueIntel(splitIntelItems(ad.valueProposition))
  const copyItems = uniqueIntel([
    ...splitIntelItems(ad.copy),
    ...splitIntelItems(ad.headline),
  ]).filter((item) => item !== genericTitle)
  const messagingAngles =
    storedAngles.length > 0 ? storedAngles : storedValue.length > 0 ? storedValue : copyItems
  const valueProposition = storedValue.length > 0 ? storedValue : storedAngles.slice(0, 3)
  return {
    messagingAngles,
    valueProposition,
    services: uniqueIntel(intelItemsFromUnknown(ad.services)),
    pricing: uniqueIntel(splitIntelItems(ad.pricing)),
    audience: uniqueIntel(splitIntelItems(ad.audience)),
    about: ad.about?.trim() && !isNoiseIntel(ad.about) ? ad.about.trim() : '',
    keywords: uniqueIntel(intelItemsFromUnknown(ad.keywords)),
  }
}

export function resolveDestinationUrl(ad: CompetitorAd): string | null {
  const raw = ad.landingPage?.trim()
  if (!raw) return null
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

/** True when the URL is only the site root (e.g. https://myntra.com), not a specific ad landing page. */
export function isHomepageUrl(url: string | null | undefined): boolean {
  if (!url) return true
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    const path = parsed.pathname.replace(/\/+$/, '')
    return (path === '' || path === '/') && !parsed.search && !parsed.hash
  } catch {
    return true
  }
}

/** Landing URL that is more specific than the advertiser homepage, or null. */
export function resolveAdLandingUrl(ad: CompetitorAd): string | null {
  const url = resolveDestinationUrl(ad)
  if (!url || isHomepageUrl(url)) return null
  return url
}

function isSimgadUrl(url: string): boolean {
  return /^https?:\/\/tpc\.googlesyndication\.com\/archive\/simgad\/\d+\/?$/i.test(url)
}

/** True when the URL is already a Google Ads Transparency or Meta Ad Library link. */
export function isStoredTransparencyUrl(url: string): boolean {
  const value = url.trim()
  if (!value) return false
  return /adstransparency\.google\.com/i.test(value) || /(?:facebook|fb)\.com\/ads\/library/i.test(value)
}

function withHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/** Pulls individual simgad URLs out of comma / %20 concatenated cells. */
export function extractSimgadUrls(raw: string | undefined): string[] {
  if (!raw) return []
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

function storedTransparencyUrl(ad: CompetitorAd): string | null {
  for (const raw of [ad.adUrl, ad.landingPage]) {
    const stored = raw?.trim() ?? ''
    if (isStoredTransparencyUrl(stored)) return withHttp(stored)
  }
  return null
}

/**
 * Outbound link from the ad detail modal:
 * - Image/text: a stored `simgad` screenshot when present
 * - Otherwise (and always for video): the exact Transparency / Ad Library URL from the row
 * - Last resort: a landing URL that is more specific than the advertiser homepage
 *
 * Never synthesizes a Transparency URL. Never falls back to the homepage.
 */
export function resolveExactAdUrl(ad: CompetitorAd): string | null {
  if (ad.format !== 'video') {
    const screenshotCandidates = [ad.imageUrl, ...(ad.images ?? [])]
    for (const candidate of screenshotCandidates) {
      const simgad = extractSimgadUrls(candidate)[0]
      if (simgad) return simgad
    }
  }
  return storedTransparencyUrl(ad) ?? resolveAdLandingUrl(ad)
}

export function displayHost(url: string): string {
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./i, '')
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] ?? url
  }
}

export function formatPrettyDate(iso: string | undefined): string {
  if (!iso) return 'Not disclosed'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not disclosed'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatRegion(raw: string | undefined): string {
  const value = raw?.trim() ?? ''
  if (!value || value === '[object Object]') return 'Not disclosed'
  const upper = value.toUpperCase()
  if (
    upper.includes('FACEBOOK') ||
    upper.includes('INSTAGRAM') ||
    upper.includes('MESSENGER') ||
    upper.includes('AUDIENCE_NETWORK')
  ) {
    return 'Not disclosed'
  }
  const mapped = value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((code) => REGION_NAMES[code.toUpperCase()] ?? code)
  return mapped.length > 0 ? mapped.join(', ') : 'Not disclosed'
}

export function previewAssets(ad: CompetitorAd): Array<{ type: 'image' | 'video'; url: string }> {
  const seen = new Set<string>()
  const assets: Array<{ type: 'image' | 'video'; url: string }> = []
  const isVideoAd = ad.format === 'video'
  const imageSources = isVideoAd ? [] : [ad.imageUrl, ...(ad.images ?? [])]
  for (const source of imageSources) {
    for (const url of extractSimgadUrls(source)) {
      if (!url || seen.has(url)) continue
      seen.add(url)
      assets.push({ type: 'image', url })
    }
    if (source && isSimgadUrl(source) === false && /^https?:\/\//i.test(source) && !seen.has(source)) {
      if (/simgad/i.test(source)) continue
      seen.add(source)
      assets.push({ type: 'image', url: source })
    }
  }
  for (const url of ad.videos ?? []) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    assets.push({ type: 'video', url })
  }
  return assets
}
