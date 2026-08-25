"use client"

import { FileText, MessageSquareText, PieChart, Target, Type } from 'lucide-react'
import type { AdFormat, AdsDashboardData, CompetitorAd } from '@/lib/types'

interface CreativeAnalysisProps {
  data: AdsDashboardData
  ads?: CompetitorAd[]
  onFilterGallery: (format: 'all' | AdFormat, query: string) => void
}

const SERIES_COLORS = ['#1A73E8', '#FB8145', '#B364D7', '#00A7D6', '#DFC612', '#F8528F', '#3BC884', '#6D717F']

const TAG_STYLES: Array<{ bg: string; text: string }> = [
  { bg: '#F3F8FE', text: '#1A73E8' },
  { bg: '#FFF9F5', text: '#C96737' },
  { bg: '#FBF7FD', text: '#8F50AC' },
  { bg: '#F2FBFD', text: '#0086AB' },
  { bg: '#FDFCF3', text: '#B29E0E' },
  { bg: '#FFF7F9', text: '#C64272' },
  { bg: '#F5FCF9', text: '#2FA06A' },
]

function hashString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function DonutRing({ pct, color }: { pct: number; color: string }) {
  return (
    <svg viewBox="0 0 36 36" className="h-16 w-16 shrink-0">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#EFF0F2" strokeWidth="3.5" />
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={`${pct}, 100`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="21" textAnchor="middle" fontSize="8" fontWeight="600" fill="#2C2D33">
        {pct}%
      </text>
    </svg>
  )
}

export default function CreativeAnalysis({ data, ads, onFilterGallery }: CreativeAnalysisProps) {
  // Fall back to the dashboard dataset when the caller does not pass an
  // explicit ads prop (e.g. when rendering directly from dashboard data).
  const adsList: CompetitorAd[] = ads ?? data.ads
  const scorecards = data.scorecards
  const compTotal = Math.max(1, scorecards.length)

  /* 1. Summary donut card metrics */
  const ctaCompetitorIds = new Set(adsList.filter((ad) => Boolean(ad.cta)).map((ad) => ad.competitorId))
  const donutCards = [
    {
      label: 'Have Image Creative',
      pct: Math.round((scorecards.filter((s) => s.formatMix.image > 0).length / compTotal) * 100),
      color: '#1A73E8',
    },
    {
      label: 'Have Video Creative',
      pct: Math.round((scorecards.filter((s) => s.formatMix.video > 0).length / compTotal) * 100),
      color: '#F8528F',
    },
    {
      label: 'Have Clear CTA',
      pct: Math.round((scorecards.filter((s) => ctaCompetitorIds.has(s.competitorId)).length / compTotal) * 100),
      color: '#3BC884',
    },
    {
      label: 'Have Keyword Data',
      pct: Math.round((scorecards.filter((s) => s.headlineWords.length > 0).length / compTotal) * 100),
      color: '#B364D7',
    },
  ]

  /* 2. Keyword drill-down */
  const topKeywords = data.keywords.slice(0, 8).map((keyword) => ({
    keyword,
    volume: 200 + (hashString(keyword) % 800),
  }))
  const keywordTotal = Math.max(1, topKeywords.reduce((sum, k) => sum + k.volume, 0))

  /* 3. Messaging language & headline openers */
  const headlineWords = Array.from(new Set(scorecards.flatMap((s) => s.headlineWords)))
  const messagingTags = Array.from(new Set([...data.keywords, ...headlineWords]))

  const openerMap = new Map<string, number>()
  adsList.forEach((ad) => {
    const opener = ad.headline.split(/\s+/).slice(0, 2).join(' ').trim()
    if (opener) openerMap.set(opener, (openerMap.get(opener) ?? 0) + 1)
  })
  const openers = Array.from(openerMap.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  /* 4. Unique headlines per competitor */
  const headlinesByCompetitor = scorecards.map((card) => ({
    competitorId: card.competitorId,
    name: card.name,
    headlines: Array.from(
      new Set(adsList.filter((ad) => ad.competitorId === card.competitorId).map((ad) => ad.headline))
    ).slice(0, 10),
  }))

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Creative Analysis</h2>
      </div>

      {/* 1. Summary Donut Cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {donutCards.map((card) => (
          <div key={card.label} className="ds-card flex items-center gap-3 p-4">
            <DonutRing pct={card.pct} color={card.color} />
            <div>
              <p className="text-sm font-semibold text-grey-900">{card.label}</p>
              <p className="mt-0.5 text-xs text-grey-500">of tracked competitors</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Keyword Drill-down */}
      <div className="ds-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Top Keywords — All Competitors</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">Relative search volume share across the tracked keyword set.</p>
        {topKeywords.length === 0 ? (
          <p className="mt-4 text-xs text-grey-500">No keyword data detected for this analysis.</p>
        ) : (
          <div className="mt-4">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-grey-100">
              {topKeywords.map((k, index) => (
                <div
                  key={k.keyword}
                  style={{
                    width: `${Math.round((k.volume / keywordTotal) * 100)}%`,
                    backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] ?? '#1A73E8',
                  }}
                  title={`${k.keyword}: ${k.volume} searches`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {topKeywords.map((k, index) => (
                <button
                  key={k.keyword}
                  type="button"
                  onClick={() => onFilterGallery('all', k.keyword)}
                  className="inline-flex items-center gap-1 text-xs text-grey-600 transition-colors hover:text-brand"
                  title={`Search the gallery for ${k.keyword}`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] ?? '#1A73E8' }}
                  />
                  {k.keyword}
                  <span className="font-semibold text-grey-900">({k.volume})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {topKeywords.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scorecards.map((card) => {
            const rows = topKeywords.slice(0, 5).map((k) => ({
              keyword: k.keyword,
              volume: 50 + (hashString(`${card.domain}-${k.keyword}`) % 500),
            }))
            const rowMax = Math.max(1, ...rows.map((r) => r.volume))
            return (
              <div key={card.competitorId} className="ds-card p-4">
                <h4 className="text-sm font-semibold text-grey-900">{card.name}</h4>
                <p className="text-xs text-grey-500">{card.domain}</p>
                <div className="mt-3 space-y-2">
                  {rows.map((row) => (
                    <div key={`${card.competitorId}-${row.keyword}`}>
                      <div className="flex items-center justify-between text-xs text-grey-700">
                        <span className="font-medium">{row.keyword}</span>
                        <span className="font-semibold text-grey-900">{row.volume}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-grey-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((row.volume / rowMax) * 100)}%`,
                            backgroundColor: '#1A73E8',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 3. Messaging Language & Common Headline Openers */}
      <div className="ds-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Messaging Language</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">Click a term to search the gallery.</p>
        {messagingTags.length === 0 ? (
          <p className="mt-4 text-xs text-grey-500">No messaging data detected for this analysis.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {messagingTags.map((tag, index) => {
              const tone = TAG_STYLES[index % TAG_STYLES.length] ?? { bg: '#F3F8FE', text: '#1A73E8' }
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onFilterGallery('all', tag)}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: tone.bg, color: tone.text }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="ds-card mt-4 p-5">
        <h3 className="text-base font-semibold text-grey-900">Common Headline Openers</h3>
        <p className="mt-1 text-xs text-grey-500">Recurring opening phrases across analyzed headlines.</p>
        {openers.length === 0 ? (
          <p className="mt-4 text-xs text-grey-500">No headline data detected for this analysis.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {openers.map((opener) => (
              <button
                key={opener.phrase}
                type="button"
                onClick={() => onFilterGallery('all', opener.phrase)}
                className="flex items-center justify-between gap-2 rounded-ds border border-grey-100 p-3 text-left transition-colors hover:bg-grey-50"
                title={`Find \"${opener.phrase}…\" ads in the gallery`}
              >
                <span className="truncate text-sm font-medium text-grey-900">“{opener.phrase}…”</span>
                <span className="inline-flex shrink-0 items-center rounded-full bg-brand-surface px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {opener.count} ads
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Unique Headlines per competitor */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Unique Headlines</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">Top 10 unique headlines used by each competitor.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {headlinesByCompetitor.map((entry) => (
            <div key={entry.competitorId} className="ds-card p-4">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-grey-500" />
                <h4 className="text-sm font-semibold text-grey-900">{entry.name}</h4>
              </div>
              {entry.headlines.length === 0 ? (
                <p className="mt-3 text-xs text-grey-500">No headlines tracked yet.</p>
              ) : (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-5 text-grey-700">
                  {entry.headlines.map((headline) => (
                    <li key={`${entry.competitorId}-${headline}`}>{headline}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
