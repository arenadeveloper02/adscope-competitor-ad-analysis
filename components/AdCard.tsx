import type { AdFormat, AdPlatform, CompetitorAd } from '@/lib/types'

interface AdCardProps {
  ad: CompetitorAd
}

const platformStyles: Record<AdPlatform, string> = {
  'Google Ads': 'bg-brand-surface text-brand',
  Meta: 'bg-[#F7F0FB] text-[#B364D7]',
  LinkedIn: 'bg-[#EBF9FD] text-[#00A7D6]',
  TikTok: 'bg-[#FEF0F5] text-[#F8528F]',
}

const formatStyles: Record<AdFormat, string> = {
  image: 'bg-brand-surface text-brand',
  text: 'bg-[#FDFCF3] text-[#86770B]',
  video: 'bg-[#FEF0F5] text-[#F8528F]',
}

const FORMATS: AdFormat[] = ['image', 'text', 'video']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function hashAdString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

export function deriveAdFormat(ad: CompetitorAd): AdFormat {
  if (ad.format) return ad.format
  const hash = hashAdString(`${ad.id}-${ad.headline}`)
  return FORMATS[hash % FORMATS.length] ?? 'text'
}

export default function AdCard({ ad }: AdCardProps) {
  const format = deriveAdFormat(ad)
  const isActive = ad.active ?? true
  const hash = hashAdString(`${ad.id}-${ad.competitorName}`)
  const timestamp = ad.date ?? `${MONTHS[hash % 12] ?? 'Jan'} ${2024 + (hash % 2)}`
  const slug = ad.competitorName.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const destination = ad.landingPage ?? `${slug || 'landing'}.com`
  const destinationHref = destination.startsWith('http') ? destination : `https://${destination}`

  return (
    <article className="ds-card flex h-full flex-col p-5 transition-shadow duration-200 hover:shadow-ds-md">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isActive ? 'bg-success-surface text-success-deep' : 'bg-grey-100 text-grey-600'
          }`}
          title={isActive ? 'This ad is currently live' : 'This ad is paused'}
        >
          {isActive ? 'Live' : 'Paused'}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${formatStyles[format]}`}
          title={`Creative format: ${format}`}
        >
          {format}
        </span>
        <span
          className="inline-flex items-center rounded-full bg-grey-100 px-3 py-1 text-xs font-medium text-grey-700"
          title={`Advertiser: ${ad.competitorName}`}
        >
          {ad.competitorName}
        </span>
        <span
          className={`ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${platformStyles[ad.platform]}`}
          title={`Platform: ${ad.platform}`}
        >
          {ad.platform}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-grey-500" title={`Last seen: ${timestamp}`}>
        {timestamp}
      </p>
      <h3 className="mt-2 text-base font-semibold leading-6 text-grey-900">{ad.headline}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-grey-600">{ad.copy}</p>
      {ad.cta && (
        <span
          className="mt-3 inline-flex w-fit items-center rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand"
          title={`Call to action: ${ad.cta}`}
        >
          {ad.cta}
        </span>
      )}
      <a
        href={destinationHref}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-brand hover:underline"
        title={`Destination: ${destination}`}
      >
        {destination} →
      </a>
    </article>
  )
}
