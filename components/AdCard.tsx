"use client"

import { FileText, Image as ImageIcon, Video } from 'lucide-react'
import type { AdFormat, AdPlatform, CompetitorAd } from '@/lib/types'
import { displayCopy, displayHeadline, previewAssets } from '@/lib/ad-display'

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

const platformStyles: Record<AdPlatform, string> = {
  'Google Ads': 'bg-brand-surface text-brand',
  Meta: 'bg-success-surface text-success-deep',
  LinkedIn: 'bg-grey-100 text-grey-700',
  TikTok: 'bg-warning-surface text-warning-deep',
}

interface AdCardProps {
  ad: CompetitorAd
  onClick?: (ad: CompetitorAd) => void
}

export default function AdCard({ ad, onClick }: AdCardProps) {
  const format = deriveAdFormat(ad)
  const isActive = ad.active ?? true
  const FormatIcon = format === 'image' ? ImageIcon : format === 'video' ? Video : FileText
  const headline = displayHeadline(ad)
  const copy = displayCopy(ad)
  const thumb = previewAssets(ad)[0]

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick?.(ad)
      }}
      className="flex h-full cursor-pointer flex-col rounded-2xl border-2 border-grey-400 bg-white p-4 text-left shadow-md transition-shadow hover:shadow-lg"
    >
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
      <h4 className="mt-2 text-sm font-semibold leading-5 text-grey-900">{headline}</h4>
      {copy ? <p className="mt-1 text-xs leading-5 text-grey-600">{copy}</p> : null}
      {format === 'video' || thumb?.type === 'video' ? (
        <div className="mt-3 flex h-32 flex-1 items-center justify-center rounded-lg bg-grey-100">
          <Video className="h-8 w-8 text-grey-400" />
        </div>
      ) : thumb?.type === 'image' ? (
        <div className="mt-3 flex-1 overflow-hidden rounded-lg border border-grey-100 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb.url}
            alt={headline}
            referrerPolicy="no-referrer"
            className="w-full object-contain"
          />
        </div>
      ) : (
        <span className="flex-1" />
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-grey-100 pt-3">
        <span className="truncate text-xs font-medium text-grey-700">{ad.competitorName}</span>
        {ad.cta && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-brand-surface px-2.5 py-1 text-[10px] font-semibold text-brand">
            {ad.cta}
          </span>
        )}
      </div>
    </button>
  )
}
