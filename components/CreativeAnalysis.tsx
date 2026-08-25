"use client"

import { MousePointerClick, Palette, PieChart, Target } from 'lucide-react'
import type { AdFormat, CompetitorAd } from '@/lib/types'
import { deriveAdFormat } from '@/components/AdCard'

interface CreativeAnalysisProps {
  ads: CompetitorAd[]
  onFilterGallery: (format: 'all' | AdFormat, query: string) => void
}

const FORMAT_META: Array<{ id: AdFormat; label: string; color: string }> = [
  { id: 'image', label: 'Image', color: '#1A73E8' },
  { id: 'text', label: 'Text', color: '#DFC612' },
  { id: 'video', label: 'Video', color: '#F8528F' },
]

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'your', 'you', 'our', 'that', 'this', 'from', 'are',
  'has', 'have', 'more', 'into', 'can', 'get', 'its', 'new', 'now', 'all', 'out', 'here',
])

export default function CreativeAnalysis({ ads, onFilterGallery }: CreativeAnalysisProps) {
  const total = Math.max(1, ads.length)

  const formatCounts: Record<AdFormat, number> = { image: 0, text: 0, video: 0 }
  ads.forEach((ad) => {
    formatCounts[deriveAdFormat(ad)] += 1
  })

  const platformMap = new Map<string, number>()
  ads.forEach((ad) => platformMap.set(ad.platform, (platformMap.get(ad.platform) ?? 0) + 1))
  const platforms = Array.from(platformMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const wordMap = new Map<string, number>()
  ads.forEach((ad) => {
    ad.headline
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .forEach((word) => {
        if (word.length < 4 || STOP_WORDS.has(word)) return
        wordMap.set(word, (wordMap.get(word) ?? 0) + 1)
      })
  })
  const topWords = Array.from(wordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  const ctaMap = new Map<string, number>()
  ads.forEach((ad) => {
    if (ad.cta) ctaMap.set(ad.cta, (ctaMap.get(ad.cta) ?? 0) + 1)
  })
  const topCtas = Array.from(ctaMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Creative Analysis</h2>
      </div>

      {ads.length === 0 ? (
        <div className="ds-card mt-4 p-10 text-center">
          <p className="text-sm font-medium text-grey-700">No creatives to analyze yet</p>
          <p className="mt-1 text-xs text-grey-500">Run an ads analysis to see creative breakdowns.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Format breakdown — click a format to filter the gallery */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">Format Breakdown</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Click a format to open it in the gallery.</p>
            <div className="mt-4 space-y-3">
              {FORMAT_META.map((meta) => {
                const count = formatCounts[meta.id]
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

          {/* Platform distribution */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">Platform Distribution</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Where the tracked creatives are running.</p>
            <div className="mt-4 space-y-3">
              {platforms.map((platform) => {
                const pct = Math.round((platform.count / total) * 100)
                return (
                  <div key={platform.name}>
                    <div className="flex items-center justify-between text-xs text-grey-700">
                      <span className="font-medium">{platform.name}</span>
                      <span className="font-semibold text-grey-900">
                        {platform.count} ads · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: '#1A73E8' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top headline words */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">Top Headline Words</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Click a word to search the gallery.</p>
            {topWords.length === 0 ? (
              <p className="mt-4 text-xs text-grey-500">No headline data detected.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {topWords.map(([word, count]) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => onFilterGallery('all', word)}
                    className="inline-flex items-center gap-1 rounded-full border border-grey-200 bg-grey-50 px-3 py-1 text-xs font-medium text-grey-700 transition-colors hover:bg-brand hover:text-white"
                  >
                    {word}
                    <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTA usage */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">CTA Usage</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Click a CTA to find it in the gallery.</p>
            {topCtas.length === 0 ? (
              <p className="mt-4 text-xs text-grey-500">No CTA data detected.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {topCtas.map(([label, count]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onFilterGallery('all', label)}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                  >
                    {label}
                    <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
