import type { AdPlatform, CompetitorAd } from '@/lib/types'

interface AdCardProps {
  ad: CompetitorAd
}

const platformStyles: Record<AdPlatform, string> = {
  'Google Ads': 'bg-brand-surface text-brand',
  Meta: 'bg-[#F7F0FB] text-[#B364D7]',
  LinkedIn: 'bg-[#EBF9FD] text-[#00A7D6]',
  TikTok: 'bg-[#FEF0F5] text-[#F8528F]',
}

export default function AdCard({ ad }: AdCardProps) {
  return (
    <article className="ds-card flex h-full flex-col p-5 transition-shadow duration-200 hover:shadow-ds-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-grey-500">
          {ad.competitorName}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${platformStyles[ad.platform]}`}
        >
          {ad.platform}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-6 text-grey-900">{ad.headline}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-grey-600">{ad.copy}</p>
    </article>
  )
}
