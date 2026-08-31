"use client"

import {
  Activity,
  BarChart3,
  Image as ImageIcon,
  Images,
  MousePointerClick,
  PieChart,
  Search,
  Users,
} from 'lucide-react'
import type { AdFormat, CompetitorAd } from '@/lib/types'
import AdCard, { deriveAdFormat } from '@/components/AdCard'

interface AdGalleryProps {
  ads: CompetitorAd[]
  search: string
  format: 'all' | AdFormat
  onSearchChange: (value: string) => void
  onFormatChange: (value: 'all' | AdFormat) => void
  /** Unique competitors excluding the entered company (competitor_name = self). */
  competitorCount?: number
}

const FORMAT_FILTERS: Array<{ id: 'all' | AdFormat; label: string }> = [
  { id: 'all', label: 'All Formats' },
  { id: 'image', label: 'Image' },
  { id: 'text', label: 'Text' },
  { id: 'video', label: 'Video' },
]

const SHARE_COLORS = ['#1A73E8', '#FB8145', '#B364D7', '#00A7D6', '#DFC612', '#F8528F', '#3BC884', '#6D717F']

const MIX_META: Array<{ id: AdFormat; label: string; color: string }> = [
  { id: 'image', label: 'Image', color: '#1A73E8' },
  { id: 'text', label: 'Text', color: '#DFC612' },
  { id: 'video', label: 'Video', color: '#F8528F' },
]

export default function AdGallery({
  ads,
  search,
  format,
  onSearchChange,
  onFormatChange,
  competitorCount: competitorCountProp,
}: AdGalleryProps) {
  const query = search.trim().toLowerCase()
  const filtered = ads.filter((ad) => {
    if (format !== 'all' && deriveAdFormat(ad) !== format) return false
    if (!query) return true
    const haystack = `${ad.headline} ${ad.copy} ${ad.cta ?? ''} ${ad.competitorName} ${ad.platform} ${ad.keywords?.join(' ') ?? ''}`.toLowerCase()
    return haystack.includes(query)
  })

  /* ---------------- Summary dashboard metrics (full ads set) ---------------- */
  const totalAds = ads.length
  const activeCount = ads.filter((ad) => ad.active ?? true).length
  const activePct = totalAds > 0 ? Math.round((activeCount / totalAds) * 100) : 0
  const formatCounts: Record<AdFormat, number> = { image: 0, text: 0, video: 0 }
  ads.forEach((ad) => {
    formatCounts[deriveAdFormat(ad)] += 1
  })
  const mixTotal = Math.max(1, totalAds)

  const shareMap = new Map<string, number>()
  ads.forEach((ad) => {
    shareMap.set(ad.competitorName, (shareMap.get(ad.competitorName) ?? 0) + 1)
  })
  const competitorShare = Array.from(shareMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const competitorCount =
    competitorCountProp ??
    new Set(
      ads
        .filter((ad) => ad.competitorName.trim().toLowerCase() !== 'self')
        .map((ad) => ad.competitorId)
    ).size

  const ctaMap = new Map<string, number>()
  ads.forEach((ad) => {
    if (ad.cta) ctaMap.set(ad.cta, (ctaMap.get(ad.cta) ?? 0) + 1)
  })
  const ctaEntries = Array.from(ctaMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
  const topCta = ctaEntries[0] ?? null

  const kpiCards = [
    { label: 'Total Ads Tracked', value: String(totalAds), icon: BarChart3 },
    { label: 'Active Ads', value: String(activeCount), icon: Activity },
    { label: 'Image Creatives', value: String(formatCounts.image), icon: ImageIcon },
    { label: 'Competitors', value: String(competitorCount), icon: Users },
  ]

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Images className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Ad Gallery</h2>
      </div>

      <div className="ds-card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search headlines, copy, CTAs…"
            className="ds-input pl-11"
            style={{ paddingLeft: '44px' }}
            aria-label="Search ads"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMAT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFormatChange(filter.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                format === filter.id
                  ? 'bg-brand text-white'
                  : 'border border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ad Gallery Summary Dashboard — directly above the ad cards grid */}
      {totalAds > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className="ds-card p-4" title={`${kpi.label}: ${kpi.value}`}>
                <div className="flex items-center gap-2 text-grey-500">
                  <kpi.icon className="h-4 w-4" />
                  <span className="text-xs font-medium tracking-wide">{kpi.label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-grey-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Secondary metrics row — Timeline removed; balanced 3-card layout */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Activity donut */}
            <div className="ds-card p-4">
              <div className="flex items-center gap-2 text-grey-500">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium tracking-wide">Activity</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <svg viewBox="0 0 36 36" className="h-16 w-16 shrink-0">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#EFF0F2" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#3BC884"
                    strokeWidth="3.5"
                    strokeDasharray={`${activePct}, 100`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div>
                  <p className="text-xl font-semibold text-grey-900">{activePct}%</p>
                  <p className="text-xs text-grey-500">
                    {activeCount} of {totalAds} live
                  </p>
                </div>
              </div>
            </div>

            {/* Creative Mix */}
            <div className="ds-card p-4">
              <div className="flex items-center gap-2 text-grey-500">
                <PieChart className="h-4 w-4" />
                <span className="text-xs font-medium tracking-wide">Creative Mix</span>
              </div>
              <div className="mt-3 space-y-2">
                {MIX_META.map((meta) => {
                  const count = formatCounts[meta.id]
                  const pct = Math.round((count / mixTotal) * 100)
                  return (
                    <div key={meta.id}>
                      <div className="flex items-center justify-between text-xs text-grey-700">
                        <span className="font-medium">{meta.label}</span>
                        <span className="font-semibold text-grey-900">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-grey-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top CTA */}
            <div className="ds-card p-4">
              <div className="flex items-center gap-2 text-grey-500">
                <MousePointerClick className="h-4 w-4" />
                <span className="text-xs font-medium tracking-wide">Top CTA</span>
              </div>
              {topCta ? (
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full bg-brand-surface px-3 py-1 text-sm font-semibold text-brand">
                    {topCta.label}
                  </span>
                  <p className="mt-2 text-xs text-grey-500">Used in {topCta.count} ads</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-grey-500">No CTA data available</p>
              )}
            </div>
          </div>

          {/* Competitor Ad Share */}
          <div className="ds-card mt-4 p-4">
            <div className="flex items-center gap-2 text-grey-500">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium tracking-wide">Competitor Ad Share</span>
            </div>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-grey-100">
              {competitorShare.map((entry, index) => (
                <div
                  key={entry.name}
                  style={{
                    width: `${Math.round((entry.count / mixTotal) * 100)}%`,
                    backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length] ?? '#1A73E8',
                  }}
                  title={`${entry.name}: ${entry.count} ads`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-grey-600">
              {competitorShare.map((entry, index) => (
                <span key={entry.name} className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length] ?? '#1A73E8' }}
                  />
                  {entry.name}
                  <span className="font-semibold text-grey-900">{entry.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="ds-card mt-6 p-10 text-center">
          <p className="text-sm font-medium text-grey-700">No ads match your filters</p>
          <p className="mt-1 text-xs text-grey-500">Try a different search term or format filter.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}
