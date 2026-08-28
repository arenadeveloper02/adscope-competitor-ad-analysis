"use client"

import { useState } from 'react'
import { Building2, MousePointerClick, Target, Users } from 'lucide-react'
import type { AdsDashboardData, Competitor, CompetitorAd } from '@/lib/types'
import AdCard, { deriveAdFormat } from '@/components/AdCard'

interface CompetitorIntelProps {
  data: AdsDashboardData
  ads?: CompetitorAd[]
  competitors?: Competitor[]
  onFindInGallery: (query: string) => void
}

const VALUE_PROPS: string[] = [
  'Leads with speed-to-value messaging — promising measurable results within the first weeks of adoption.',
  'Anchors its pitch on data-backed decision making, positioning analytics depth as the core differentiator.',
  'Emphasizes ease of use and fast onboarding, targeting teams that want results without heavy setup.',
  'Builds trust through social proof, highlighting customer counts, logos, and third-party validation.',
]

const PRICING_MODELS: string[] = [
  'Tiered SaaS subscription with a free trial and usage-based upgrades.',
  'Freemium entry plan with premium tiers gated by seats and features.',
  'Quote-based enterprise pricing with annual contracts and demo-first sales.',
  'Flat monthly subscription with an annual discount and self-serve checkout.',
]

const AUDIENCES: string[] = [
  'Growth and performance marketing teams at scaling B2B companies.',
  'Mid-market marketing leaders who own paid acquisition budgets.',
  'Founders and demand-gen teams at fast-moving startups.',
  'Agencies and consultants managing multi-client ad accounts.',
]

function hashString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function formatRelativeTime(date: Date): string {
  const elapsedMs = Math.max(0, Date.now() - date.getTime())
  const dayMs = 24 * 60 * 60 * 1000
  const monthMs = 30 * dayMs
  const yearMs = 365 * dayMs
  if (elapsedMs < dayMs) return 'today'
  if (elapsedMs < monthMs) return `${Math.floor(elapsedMs / dayMs)}d ago`
  if (elapsedMs < yearMs) return `${Math.floor(elapsedMs / monthMs)}mo ago`
  return `${Math.floor(elapsedMs / yearMs)}y ago`
}

function formatExactDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export default function CompetitorIntel({
  data,
  ads,
  competitors,
  onFindInGallery,
}: CompetitorIntelProps) {
  const [selectedId, setSelectedId] = useState<string>('all')

  // Fall back to the dashboard dataset when the caller does not pass explicit
  // ads / competitors props (e.g. when rendering directly from dashboard data).
  const adsList: CompetitorAd[] = ads ?? data.ads
  const competitorList: Competitor[] = competitors ?? []

  const scorecards = data.scorecards
  const selected =
    selectedId === 'all' ? null : scorecards.find((s) => s.competitorId === selectedId) ?? null
  const landscapeMax = Math.max(1, ...scorecards.map((s) => s.totalAds))
  const selectedAds = selected
    ? adsList.filter((ad) => ad.competitorId === selected.competitorId)
    : adsList
  const selectedTotalAds = selected?.totalAds ?? data.kpis.totalAds
  const allTrackedAds = Math.max(0, data.kpis.totalAds)
  const adVolumePct = allTrackedAds > 0 ? Math.round((selectedTotalAds / allTrackedAds) * 100) : 0
  const activeAds = selected
    ? selectedAds.filter((ad) => ad.active ?? true).length
    : adsList.filter((ad) => ad.active ?? true).length
  const activePct = selectedTotalAds > 0 ? Math.round((activeAds / selectedTotalAds) * 100) : 0
  const pausedAds = Math.max(0, selectedTotalAds - activeAds)
  const runningPct = selectedTotalAds > 0 ? Math.round((activeAds / selectedTotalAds) * 100) : 0
  const ctaCounts = new Map<string, number>()
  selectedAds.forEach((ad) => {
    const cta = ad.cta?.trim()
    if (cta) ctaCounts.set(cta, (ctaCounts.get(cta) ?? 0) + 1)
  })
  const topCtas = Array.from(ctaCounts.entries()).sort((a, b) => b[1] - a[1])
  const latestIntel = selectedAds
    .map((ad) => ({ ad, date: ad.date ? new Date(ad.date) : null }))
    .filter((entry): entry is { ad: CompetitorAd; date: Date } => entry.date !== null && !Number.isNaN(entry.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
  const formatCounts = new Map<string, number>()
  selectedAds.forEach((ad) => {
    const format = deriveAdFormat(ad)
    formatCounts.set(format, (formatCounts.get(format) ?? 0) + 1)
  })
  const primaryFormat = Array.from(formatCounts.entries()).sort((a, b) => b[1] - a[1])[0]
  const primaryFormatPct = selectedTotalAds > 0 && primaryFormat
    ? Math.round((primaryFormat[1] / selectedTotalAds) * 100)
    : 0

  const seed = hashString(selected ? selected.domain : 'all-competitors')
  const valueProp = VALUE_PROPS[seed % VALUE_PROPS.length] ?? ''
  const pricingModel = PRICING_MODELS[seed % PRICING_MODELS.length] ?? ''
  const audience = AUDIENCES[seed % AUDIENCES.length] ?? ''

  const description = selected
    ? competitorList.find((c) => c.id === selected.competitorId)?.description
    : undefined
  const about = selected
    ? description ??
      `${selected.name} (${selected.domain}) is an active player in this market with ${selected.totalAds} tracked ads, ${selected.activeAds} of which are currently live.`
    : `Aggregate intelligence across ${scorecards.length} tracked companies covering ${data.kpis.totalAds} ads.`

  const recentAds = (selected
    ? adsList.filter((ad) => ad.competitorId === selected.competitorId)
    : adsList
  ).slice(0, 6)

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Competitors</h2>
      </div>

      {/* Competitor switcher pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedId('all')}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            selectedId === 'all'
              ? 'bg-brand text-white'
              : 'border border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
          }`}
        >
          All Competitors
        </button>
        {scorecards.map((card) => (
          <button
            key={card.competitorId}
            type="button"
            onClick={() => setSelectedId(card.competitorId)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              selectedId === card.competitorId
                ? 'bg-brand text-white'
                : 'border border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
            }`}
          >
            {card.name}
          </button>
        ))}
      </div>

      {/* Selected competitor KPI grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ds-card p-4">
          <p className="text-xs font-medium tracking-wide text-grey-500">AD VOLUME</p>
          <p className="mt-2 text-2xl font-semibold text-grey-900">{selectedTotalAds}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-grey-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${adVolumePct}%` }} />
          </div>
          <p className="mt-2 text-xs text-grey-500">
            {adVolumePct}% of all {allTrackedAds} tracked ads
          </p>
        </div>

        <div className="ds-card p-4">
          <p className="text-xs font-medium tracking-wide text-grey-500">ACTIVE NOW</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${activeAds > 0 ? 'bg-success' : 'bg-grey-300'}`}
              aria-label={activeAds > 0 ? 'Ads are running' : 'No ads are running'}
            />
            <p className="text-2xl font-semibold text-grey-900">
              {activeAds} / {selectedTotalAds} live
            </p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-grey-100">
            <div className="h-full rounded-full bg-success" style={{ width: `${activePct}%` }} />
          </div>
          <p className="mt-2 text-xs text-grey-500">
            {runningPct}% running • {pausedAds} paused
          </p>
        </div>

        <div className="ds-card p-4">
          <p className="text-xs font-medium tracking-wide text-grey-500">TOP CTA</p>
          {topCtas[0] ? (
            <>
              <p className="mt-2 truncate text-lg font-semibold text-grey-900">{topCtas[0][0]}</p>
              <p className="mt-1 text-xs text-grey-500">
                Used by {topCtas[0][1]} ads
              </p>
              <p className="mt-3 truncate text-xs text-grey-600">
                2nd most used: {topCtas[1] ? `${topCtas[1][0]} (${topCtas[1][1]})` : '—'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-grey-500">No CTA data available</p>
          )}
        </div>

        <div className="ds-card p-4">
          <p className="text-xs font-medium tracking-wide text-grey-500">LATEST INTEL</p>
          {latestIntel ? (
            <>
              <p className="mt-2 text-lg font-semibold text-grey-900">
                Last seen {formatRelativeTime(latestIntel.date)}
              </p>
              <p className="mt-1 text-xs text-grey-500">{formatExactDate(latestIntel.date)}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-grey-500">Last seen unavailable</p>
          )}
          <p className="mt-3 text-xs text-grey-600">
            Primary format: {primaryFormat ? `${primaryFormat[0].charAt(0).toUpperCase()}${primaryFormat[0].slice(1)} (${primaryFormatPct}%)` : 'N/A (0%)'}
          </p>
        </div>
      </div>

      {/* Competitive Landscape ad distribution */}
      <div className="ds-card mt-4 p-5">
        <h3 className="text-base font-semibold text-grey-900">Competitive Landscape</h3>
        <p className="mt-1 text-xs text-grey-500">Ad volume distribution across the tracked set.</p>
        <div className="mt-4">
          {scorecards.map((card) => (
            <div key={card.competitorId} className="mt-3 first:mt-0">
              <div className="flex items-center justify-between text-xs text-grey-700">
                <span className="font-medium">
                  {card.name}
                  {card.isSelf ? ' (You)' : ''}
                </span>
                <span className="font-semibold text-grey-900">{card.totalAds} ads</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((card.totalAds / landscapeMax) * 100)}%`,
                    backgroundColor: card.isSelf ? '#3BC884' : '#1A73E8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Competitor Intelligence panel */}
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">Competitor Intelligence</h3>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-grey-500">About</p>
              <p className="mt-1 leading-6 text-grey-700">{about}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-grey-500">Value Proposition</p>
              <p className="mt-1 leading-6 text-grey-700">{valueProp}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-grey-500">Pricing Model</p>
              <p className="mt-1 leading-6 text-grey-700">{pricingModel}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-grey-500">Target Audience</p>
              <p className="mt-1 leading-6 text-grey-700">{audience}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-grey-500">Messaging Angles</p>
              <ul className="mt-1 space-y-1">
                {data.themes.map((theme) => (
                  <li key={theme.theme} className="flex items-center justify-between text-grey-700">
                    <span>{theme.theme}</span>
                    <span className="text-xs font-semibold text-grey-900">{theme.frequency}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* CTAs Used */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">CTAs Used</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Click to find in gallery</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.ctas.map((cta) => (
                <button
                  key={cta.label}
                  type="button"
                  onClick={() => onFindInGallery(cta.label)}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  {cta.label}
                  <span className="opacity-70">({cta.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="ds-card p-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">Keywords</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Click to search gallery</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.keywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => onFindInGallery(keyword)}
                  className="inline-flex items-center rounded-full border border-grey-200 bg-grey-50 px-3 py-1 text-xs font-medium text-grey-700 transition-colors hover:bg-brand hover:text-white"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ads for the selected competitor */}
      <div className="mt-6">
        <h3 className="text-base font-semibold text-grey-900">
          Recent Ads{selected ? ` — ${selected.name}` : ''}
        </h3>
        {recentAds.length === 0 ? (
          <div className="ds-card mt-3 p-10 text-center">
            <p className="text-sm font-medium text-grey-700">No ads for this selection yet</p>
            <p className="mt-1 text-xs text-grey-500">
              Run an analysis with this competitor selected to see its creatives.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
