import { ExternalLink, FileText, Image as ImageIcon, Video } from 'lucide-react'
import type { AdFormat, AdPlatform, CompetitorAd } from '@/lib/types'

/**
 * Deterministically derives the creative format for an ad. Uses the explicit
 * format when the workflow provided one, otherwise hashes the ad id so the
 * derived format is stable across renders and sessions.
 */
export function deriveAdFormat(ad: CompetitorAd): AdFormat {
  if (ad.format) return ad.format
  let hash = 7
  for (let i = 0; i < ad.id.length; i++) {
    hash = (hash * 31 + ad.id.charCodeAt(i)) >>> 0
  }
  const formats: AdFormat[] = ['image', 'text', 'video']
  return formats[hash % formats.length] ?? 'text'
}

/**
 * Resolves the ad's real destination/landing URL from the ads data. Returns
 * null when the ad has no destination so the card stays non-clickable.
 */
function resolveDestinationUrl(ad: CompetitorAd): string | null {
  const raw = ad.landingPage?.trim()
  if (!raw) return null
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

const platformStyles: Record<AdPlatform, string> = {
  'Google Ads': 'bg-brand-surface text-brand',
  Meta: 'bg-success-surface text-success-deep',
  LinkedIn: 'bg-grey-100 text-grey-700',
  TikTok: 'bg-warning-surface text-warning-deep',
}

interface AdCardProps {
  ad: CompetitorAd
}

export default function AdCard({ ad }: AdCardProps) {
  const format = deriveAdFormat(ad)
  const isActive = ad.active ?? true
  const FormatIcon = format === 'image' ? ImageIcon : format === 'video' ? Video : FileText
  const destUrl = resolveDestinationUrl(ad)

  const cardBody = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${platformStyles[ad.platform]}`}
        >
          {ad.platform}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            isActive ? 'bg-success-surface text-success-deep' : 'bg-grey-100 text-grey-600'
          }`}
        >
          {isActive ? 'LIVE' : 'PAUSED'}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-grey-500">
        <FormatIcon className="h-4 w-4" />
        <span className="capitalize">{format} ad</span>
        {ad.date && <span className="text-grey-400">· {ad.date}</span>}
      </div>
      <h4 className="mt-2 text-sm font-semibold leading-5 text-grey-900">{ad.headline}</h4>
      <p className="mt-1 flex-1 text-xs leading-5 text-grey-600">{ad.copy}</p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-grey-100 pt-3">
        <span className="truncate text-xs font-medium text-grey-700">{ad.competitorName}</span>
        {ad.cta && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-surface px-2.5 py-1 text-[10px] font-semibold text-brand">
            {ad.cta}
            {ad.landingPage && <ExternalLink className="h-3 w-3" />}
          </span>
        )}
      </div>
    </>
  )

  // When the ad has a real destination URL, the entire card (including the CTA
  // pill and the competitor/domain text) opens it in a new browser tab.
  if (destUrl) {
    return (
      <a
        href={destUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ds-card flex h-full cursor-pointer flex-col p-4 transition-shadow hover:shadow-md"
        title={`Open ad destination: ${destUrl}`}
      >
        {cardBody}
      </a>
    )
  }

  return <article className="ds-card flex h-full flex-col p-4">{cardBody}</article>
}
