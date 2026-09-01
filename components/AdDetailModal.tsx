"use client"

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Lightbulb,
  Tag,
  Video,
  X,
} from 'lucide-react'
import type { CompetitorAd } from '@/lib/types'
import { deriveAdFormat } from '@/components/AdCard'
import {
  adIntelligence,
  displayHeadline,
  displayHost,
  formatPrettyDate,
  formatRegion,
  previewAssets,
  resolveExactAdUrl,
} from '@/lib/ad-display'

interface AdDetailModalProps {
  ad: CompetitorAd | null
  onClose: () => void
}

type IntelKey =
  | 'messaging'
  | 'value'
  | 'services'
  | 'pricing'
  | 'audience'
  | 'about'
  | 'keywords'

const ANGLE_PREVIEW = 5

export default function AdDetailModal({ ad, onClose }: AdDetailModalProps) {
  const [slide, setSlide] = useState(0)
  const [openSection, setOpenSection] = useState<IntelKey | null>('messaging')
  const [anglesExpanded, setAnglesExpanded] = useState(false)

  useEffect(() => {
    setSlide(0)
    setOpenSection('messaging')
    setAnglesExpanded(false)
  }, [ad?.id])

  useEffect(() => {
    if (!ad) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [ad, onClose])

  const format = ad ? deriveAdFormat(ad) : 'text'
  const FormatIcon = format === 'image' ? ImageIcon : format === 'video' ? Video : FileText
  const assets = useMemo(() => (ad ? previewAssets(ad) : []), [ad])
  const current = assets[slide] ?? null
  const destUrl = ad ? resolveExactAdUrl(ad) : null
  const ctaLabel = ad?.cta?.trim() ?? ''
  const initial = (ad?.competitorName.trim().charAt(0) ?? 'A').toUpperCase()

  if (!ad) return null

  const intel = adIntelligence(ad)
  const angles = intel.messagingAngles
  const visibleAngles = anglesExpanded ? angles : angles.slice(0, ANGLE_PREVIEW)
  const hiddenAngleCount = Math.max(0, angles.length - ANGLE_PREVIEW)

  const toggle = (key: IntelKey) => {
    setOpenSection((currentKey) => (currentKey === key ? null : key))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(44, 45, 51, 0.72)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-grey-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-3 py-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initial}
              </span>
              <span className="truncate text-sm font-semibold text-brand">{ad.competitorName}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-grey-100 px-2.5 py-1 text-xs font-medium text-grey-700">
              <FormatIcon className="h-3.5 w-3.5" />
              {format.charAt(0).toUpperCase() + format.slice(1)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-grey-400 transition-colors hover:bg-grey-50 hover:text-grey-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-grey-100 p-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-grey-500">Ad Preview</p>
            <div className="relative mt-2 overflow-hidden rounded-xl bg-grey-50">
              <div className="flex min-h-[200px] items-center justify-center p-3">
                {current?.type === 'video' ? (
                  <video
                    key={current.url}
                    src={current.url}
                    controls
                    className="max-h-[360px] w-full object-contain"
                  />
                ) : current?.type === 'image' ? (
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open ad screenshot"
                    className="block w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={current.url}
                      alt={displayHeadline(ad)}
                      referrerPolicy="no-referrer"
                      className="max-h-[420px] w-full cursor-zoom-in object-contain"
                    />
                  </a>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-grey-400">
                    <FormatIcon className="h-10 w-10" />
                    <p className="px-6 text-center text-sm font-medium text-grey-600">{displayHeadline(ad)}</p>
                  </div>
                )}
              </div>
              {assets.length > 1 && (
                <>
                  <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {slide + 1}/{assets.length}
                  </span>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {assets.map((asset, index) => (
                      <button
                        key={`${asset.url}-${index}`}
                        type="button"
                        aria-label={`Show creative ${index + 1}`}
                        onClick={() => setSlide(index)}
                        className={`h-2 w-2 rounded-full ${index === slide ? 'bg-brand' : 'bg-grey-300'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {ctaLabel && (
              destUrl ? (
                <a
                  href={destUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {ctaLabel}
                </a>
              ) : (
                <div className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {ctaLabel}
                </div>
              )
            )}

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-grey-500">Details</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: 'Last Shown', value: formatPrettyDate(ad.date || ad.lastShown) },
                { label: 'Region', value: formatRegion(ad.region) },
                { label: 'Impressions', value: ad.impressions || 'Not disclosed' },
                { label: 'Language', value: ad.language || 'English' },
                { label: 'Platform', value: ad.platform },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-grey-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-grey-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-grey-900">{item.value}</p>
                </div>
              ))}
            </div>

            {destUrl && (
              <a
                href={destUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 rounded-xl bg-brand-surface px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
              >
                <Globe className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{displayHost(destUrl)}</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            )}
          </div>

          <div className="flex min-h-0 flex-col p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-grey-500">Intelligence</p>
            <div className="mt-2 divide-y divide-grey-100">
              <IntelRow
                icon={Lightbulb}
                title="Messaging Angles"
                open={openSection === 'messaging'}
                onToggle={() => toggle('messaging')}
              >
                {angles.length === 0 ? (
                  <p className="text-sm text-grey-500">Not disclosed</p>
                ) : (
                  <>
                    <ol className="space-y-2">
                      {visibleAngles.map((angle, index) => (
                        <li key={`${angle}-${index}`} className="flex items-start gap-2 text-sm text-grey-800">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
                            {index + 1}
                          </span>
                          <span>{angle}</span>
                        </li>
                      ))}
                    </ol>
                    {!anglesExpanded && hiddenAngleCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setAnglesExpanded(true)}
                        className="mt-2 text-xs font-medium text-grey-500 hover:text-brand"
                      >
                        +{hiddenAngleCount} more...
                      </button>
                    )}
                  </>
                )}
              </IntelRow>
              <IntelRow
                icon={Tag}
                title="Value Proposition"
                open={openSection === 'value'}
                onToggle={() => toggle('value')}
              >
                <IntelBody items={intel.valueProposition} />
              </IntelRow>
              <IntelRow
                icon={Tag}
                title="Services"
                open={openSection === 'services'}
                onToggle={() => toggle('services')}
              >
                <IntelBody items={intel.services} />
              </IntelRow>
              <IntelRow
                icon={Tag}
                title="Pricing Model"
                open={openSection === 'pricing'}
                onToggle={() => toggle('pricing')}
              >
                <IntelBody items={intel.pricing} />
              </IntelRow>
              <IntelRow
                icon={Tag}
                title="Target Audience"
                open={openSection === 'audience'}
                onToggle={() => toggle('audience')}
              >
                <IntelBody items={intel.audience} />
              </IntelRow>
              <IntelRow
                icon={Globe}
                title="About Advertiser"
                open={openSection === 'about'}
                onToggle={() => toggle('about')}
              >
                {intel.about ? (
                  <p className="text-sm leading-6 text-grey-700">{intel.about}</p>
                ) : (
                  <p className="text-sm text-grey-500">Not disclosed</p>
                )}
              </IntelRow>
              <IntelRow
                icon={Tag}
                title={`Keywords${intel.keywords.length ? ` (${intel.keywords.length})` : ''}`}
                open={openSection === 'keywords'}
                onToggle={() => toggle('keywords')}
              >
                {intel.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {intel.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-grey-200 bg-grey-50 px-2.5 py-0.5 text-xs text-grey-700"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-grey-500">Not disclosed</p>
                )}
              </IntelRow>
            </div>
            {ad.externalAdId && (
              <p className="mt-auto pt-4 text-right font-mono text-[10px] text-grey-400">{ad.externalAdId}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function IntelRow({
  icon: Icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: typeof Tag
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-3 text-left"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 text-grey-500" />
        <span className="flex-1 text-sm font-semibold text-grey-900">{title}</span>
        <ChevronDown className={`h-4 w-4 text-grey-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3 pl-6">{children}</div>}
    </div>
  )
}

function IntelBody({ items }: { items: string[] }) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean)
  if (cleaned.length === 0) return <p className="text-sm text-grey-500">Not disclosed</p>
  if (cleaned.length === 1) return <p className="text-sm leading-6 text-grey-700">{cleaned[0]}</p>
  return (
    <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-grey-700">
      {cleaned.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
