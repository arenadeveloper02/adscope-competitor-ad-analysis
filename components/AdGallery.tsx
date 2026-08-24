"use client"

import { Activity, BarChart3, Images, MousePointerClick, PieChart, Search } from 'lucide-react'
import type { AdFormat, AdsDashboardData, CompetitorAd } from '@/lib/types'
import AdCard from '@/components/AdCard'

interface AdGalleryProps {
  ads: CompetitorAd[]
  data: AdsDashboardData
  search: string
  onSearchChange: (value: string) => void
  format: 'all' | AdFormat
  onFormatChange: (value: 'all' | AdFormat) => void
}

const SHARE_COLORS = ['#1A73E8', '#FB8145', '#B364D7', '#00A7D6', '#DFC612', '#F8528F', '#3BC884', '#6D717F']

const FORMATS: AdFormat[] = ['image', 'text', 'video']

function deriveFormat(ad: CompetitorAd): AdFormat {
  let hash = 7
  const source = `${ad.id}-${ad.headline}`
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  }
  return FORMATS[hash % FORMATS.length] ?? 'text'
}

export default function AdGallery({
  ads,
  data,
  search,
  onSearchChange,
  format,
  onFormatChange,
}: AdGalleryProps) {
  const formatCounts: Record<AdFormat, number> = { image: 0, text: 0, video: 0 }
  ads.forEach((ad) => {
    formatCounts[deriveFormat(ad)] += 1
  })

  const query = search.trim().toLowerCase()
  const filtered = ads.filter((ad) => {
    if (format !== 'all' && deriveFormat(ad) !== format) return false
    if (!query) return true
    return [ad.headline, ad.copy, ad.competitorName, ad.platform].some((field) =>
      field.toLowerCase().includes(query)
    )
  })

  const topCta = data.ctas.length > 0 ? data.ctas[0] : undefined
  const mixTotal = Math.max(1, ads.length)
  const imagePct = Math.round((formatCounts.image / mixTotal) * 100)
  const videoPct = Math.round((formatCounts.video / mixTotal) * 100)
  const textPct = Math.max(0, 100 - imagePct - videoPct)

  const shareMap = new Map<string, number>()
  ads.forEach((ad) => shareMap.set(ad.competitorName, (shareMap.get(ad.competitorName) ?? 0) + 1))
  const shareEntries = Array.from(shareMap.entries())

  const pills: Array<{ id: 'all' | AdFormat; label: string; count: number }> = [
    { id: 'all', label: 'All', count: ads.length },
    { id: 'image', label: 'Image', count: formatCounts.image },
    { id: 'text', label: 'Text', count: formatCounts.text },
    { id: 'video', label: 'Video', count: formatCounts.video },
  ]

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Images className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Ad Gallery</h2>
      </div>

      {/* Search + format breakdown pills */}
      <div className="ds-card mt-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search headlines, copy, competitors..."
              className="ds-input pl-9"
              aria-label="Search ads"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {pills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => onFormatChange(pill.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  format === pill.id
                    ? 'bg-brand text-white'
                    : 'border border-grey-200 bg-grey-50 text-grey-700 hover:bg-grey-100'
                }`}
              >
                {pill.label}
                <span className={format === pill.id ? 'text-white/80' : 'text-grey-500'}>({pill.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity / Creative Mix / Top CTA widgets */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ds-card p-4">
          <div className="flex items-center gap-2 text-grey-500">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide">Activity</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-grey-900">{data.kpis.activePct}%</p>
          <p className="text-xs text-grey-500">of tracked ads are currently active</p>
        </div>
        <div className="ds-card p-4">
          <div className="flex items-center gap-2 text-grey-500">
            <PieChart className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide">Creative Mix</span>
          </div>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-grey-100">
            <div style={{ width: `${imagePct}%`, backgroundColor: '#1A73E8' }} />
            <div style={{ width: `${textPct}%`, backgroundColor: '#DFC612' }} />
            <div style={{ width: `${videoPct}%`, backgroundColor: '#F8528F' }} />
          </div>
          <p className="mt-2 text-xs text-grey-600">
            Image {imagePct}% · Text {textPct}% · Video {videoPct}%
          </p>
        </div>
        <div className="ds-card p-4">
          <div className="flex items-center gap-2 text-grey-500">
            <MousePointerClick className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide">Top CTA</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-grey-900">{topCta ? topCta.label : '—'}</p>
          <p className="text-xs text-grey-500">
            {topCta ? `${topCta.count} uses across tracked ads` : 'No CTA data yet'}
          </p>
        </div>
      </div>

      {/* Competitor Ad Share bar */}
      <div className="ds-card mt-4 p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Competitor Ad Share</h3>
        </div>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-grey-100">
          {shareEntries.map(([name, count], index) => (
            <div
              key={name}
              style={{
                width: `${(count / mixTotal) * 100}%`,
                backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length] ?? '#1A73E8',
              }}
              title={`${name}: ${count} ads`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-grey-600">
          {shareEntries.map(([name, count], index) => (
            <span key={name} className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length] ?? '#1A73E8' }}
              />
              {name} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Ad creative grid */}
      {filtered.length === 0 ? (
        <div className="ds-card mt-4 p-12 text-center">
          <p className="text-sm font-medium text-grey-700">No ads match your filters</p>
          <p className="mt-1 text-xs text-grey-500">Try a different search term or format.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}
