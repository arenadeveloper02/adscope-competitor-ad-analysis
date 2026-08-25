"use client"

import { MessageSquareText, MousePointerClick, PieChart, Type } from 'lucide-react'
import type { AdFormat, AdsDashboardData, CompetitorAd } from '@/lib/types'
import { deriveAdFormat } from '@/components/AdCard'

interface CreativeAnalysisProps {
  data: AdsDashboardData
  ads?: CompetitorAd[]
  onFilterGallery: (format: 'all' | AdFormat, query: string) => void
}

const FORMAT_META: Array<{ id: AdFormat; label: string; color: string }> = [
  { id: 'image', label: 'Image', color: '#1A73E8' },
  { id: 'text', label: 'Text', color: '#DFC612' },
  { id: 'video', label: 'Video', color: '#F8528F' },
]

export default function CreativeAnalysis({ data, ads, onFilterGallery }: CreativeAnalysisProps) {
  // Fall back to the dashboard dataset when the caller does not pass an
  // explicit ads prop (e.g. when rendering directly from dashboard data).
  const adsList: CompetitorAd[] = ads ?? data.ads
  const total = Math.max(1, adsList.length)
  const counts: Record<AdFormat, number> = { image: 0, text: 0, video: 0 }
  adsList.forEach((ad) => {
    counts[deriveAdFormat(ad)] += 1
  })
  const ctaMax = Math.max(1, ...data.ctas.map((c) => c.count))
  const themeMax = Math.max(1, ...data.themes.map((t) => t.frequency))
  const headlineWords = Array.from(new Set(data.scorecards.flatMap((s) => s.headlineWords)))

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Creative Analysis</h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Creative format breakdown */}
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">Format Breakdown</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Click a format to filter the gallery.</p>
          <div className="mt-4 space-y-3">
            {FORMAT_META.map((meta) => {
              const count = counts[meta.id]
              const pct = Math.round((count / total) * 100)
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => onFilterGallery(meta.id, '')}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between text-xs text-grey-700">
                    <span className="font-medium">{meta.label}</span>
                    <span className="font-semibold text-grey-900">
                      {count} ads · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* CTA usage */}
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">CTA Usage</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Click a CTA to find matching ads in the gallery.</p>
          <div className="mt-4 space-y-3">
            {data.ctas.map((cta) => (
              <button
                key={cta.label}
                type="button"
                onClick={() => onFilterGallery('all', cta.label)}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between text-xs text-grey-700">
                  <span className="font-medium">{cta.label}</span>
                  <span className="font-semibold text-grey-900">{cta.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((cta.count / ctaMax) * 100)}%`,
                      backgroundColor: '#1A73E8',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Messaging themes */}
        <div className="ds-card p-5">
          <h3 className="text-base font-semibold text-grey-900">Messaging Themes</h3>
          <p className="mt-1 text-xs text-grey-500">Recurring angles across the analyzed creatives.</p>
          <div className="mt-4 space-y-3">
            {data.themes.map((theme) => (
              <div key={theme.theme}>
                <div className="flex items-center justify-between text-xs text-grey-700">
                  <span className="font-medium">{theme.theme}</span>
                  <span className="font-semibold text-grey-900">{theme.frequency}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((theme.frequency / themeMax) * 100)}%`,
                      backgroundColor: '#B364D7',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequent headline words */}
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">Frequent Headline Words</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Click a word to search the gallery.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {headlineWords.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => onFilterGallery('all', word)}
                className="inline-flex items-center rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-white"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
