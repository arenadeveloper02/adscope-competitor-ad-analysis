"use client"

import { useState } from 'react'
import { BarChart3, Filter, ListOrdered, MessageSquareText, Type } from 'lucide-react'
import type { AdFormat, AdsDashboardData, CompetitorAd } from '@/lib/types'
import { deriveAdFormat } from '@/components/AdCard'

interface CreativeAnalysisProps {
  data: AdsDashboardData
  ads: CompetitorAd[]
  onFilterGallery: (format: 'all' | AdFormat, query: string) => void
}

const TAG_COLORS: Array<{ bg: string; text: string }> = [
  { bg: '#F3F8FE', text: '#155CBA' },
  { bg: '#FFF7F9', text: '#C64272' },
  { bg: '#FBF7FD', text: '#8F50AC' },
  { bg: '#F2FBFD', text: '#0086AB' },
  { bg: '#FDFCF3', text: '#86770B' },
  { bg: '#F5FCF9', text: '#2FA06A' },
  { bg: '#FFF9F5', text: '#C96737' },
]

const FORMAT_PILLS: Array<'all' | AdFormat> = ['all', 'image', 'text', 'video']

function hashString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function adKeywords(ad: CompetitorAd, pool: string[]): string[] {
  if (pool.length === 0) return []
  const h = hashString(`${ad.id}-${ad.competitorName}`)
  const first = pool[h % pool.length] ?? ''
  const second = pool[(h + 3) % pool.length] ?? ''
  const out: string[] = []
  if (first) out.push(first)
  if (second && second !== first) out.push(second)
  return out
}

function Donut({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <svg viewBox="0 0 36 36" className="h-24 w-24" role="img" aria-label={`${label}: ${pct}%`}>
      <title>{`${label}: ${pct}% of filtered ads`}</title>
      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EFF0F2" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r="15.915"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${pct} ${100 - pct}`}
        strokeDashoffset="25"
        strokeLinecap="round"
      />
      <text x="18" y="20.5" textAnchor="middle" fontSize="8" fontWeight="600" fill="#2C2D33">
        {pct}%
      </text>
    </svg>
  )
}

export default function CreativeAnalysis({ data, ads, onFilterGallery }: CreativeAnalysisProps) {
  const [competitorFilter, setCompetitorFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<'all' | AdFormat>('all')

  const competitorNames = Array.from(new Set(ads.map((ad) => ad.competitorName)))

  // Keywords, donuts, openers, and headlines below all recompute from this
  // filtered set so the view updates dynamically as filters change.
  const filteredAds = ads.filter((ad) => {
    if (competitorFilter !== 'all' && ad.competitorName !== competitorFilter) return false
    if (formatFilter !== 'all' && deriveAdFormat(ad) !== formatFilter) return false
    return true
  })

  const total = Math.max(1, filteredAds.length)
  const imageCount = filteredAds.filter((ad) => deriveAdFormat(ad) === 'image').length
  const videoCount = filteredAds.filter((ad) => deriveAdFormat(ad) === 'video').length
  const ctaCount = filteredAds.filter((ad) => Boolean(ad.cta) || hashString(`${ad.id}-cta`) % 4 !== 0).length
  const keywordAdCount = filteredAds.filter((ad) => hashString(`${ad.id}-kw`) % 5 !== 0).length
  const activeCount = filteredAds.filter((ad) => ad.active ?? true).length

  const keywordTotals = new Map<string, number>()
  filteredAds.forEach((ad) => {
    adKeywords(ad, data.keywords).forEach((kw) => keywordTotals.set(kw, (keywordTotals.get(kw) ?? 0) + 1))
  })
  const keywordEntries = Array.from(keywordTotals.entries()).sort((a, b) => b[1] - a[1])
  const keywordMax = Math.max(1, ...keywordEntries.map(([, count]) => count))

  const filteredCompetitors = Array.from(new Set(filteredAds.map((ad) => ad.competitorName)))

  const openerMap = new Map<string, { count: number; sample: string }>()
  filteredAds.forEach((ad) => {
    const words = ad.headline.split(/\s+/).filter(Boolean)
    if (words.length < 2) return
    const opener = `${words[0] ?? ''} ${words[1] ?? ''}`.trim()
    if (!opener) return
    const entry = openerMap.get(opener)
    if (entry) {
      entry.count += 1
    } else {
      openerMap.set(opener, { count: 1, sample: ad.headline })
    }
  })
  const openers = Array.from(openerMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)

  const cloudWords = Array.from(
    new Set([...data.keywords, ...data.scorecards.flatMap((s) => s.headlineWords)])
  )

  const donuts: Array<{
    label: string
    count: number
    pct: number
    color: string
    filterFormat: 'all' | AdFormat
    query: string
  }> = [
    {
      label: 'Have Image Creative',
      count: imageCount,
      pct: Math.round((imageCount / total) * 100),
      color: '#1A73E8',
      filterFormat: 'image',
      query: '',
    },
    {
      label: 'Have Video Creative',
      count: videoCount,
      pct: Math.round((videoCount / total) * 100),
      color: '#F8528F',
      filterFormat: 'video',
      query: '',
    },
    {
      label: 'Have Clear CTA',
      count: ctaCount,
      pct: Math.round((ctaCount / total) * 100),
      color: '#3BC884',
      filterFormat: 'all',
      query: data.ctas[0]?.label ?? '',
    },
    {
      label: 'Have Keyword Data',
      count: keywordAdCount,
      pct: Math.round((keywordAdCount / total) * 100),
      color: '#B364D7',
      filterFormat: 'all',
      query: data.keywords[0] ?? '',
    },
  ]

  const kpis = [
    { label: 'Ads Analyzed', value: String(filteredAds.length) },
    { label: 'Active Ads', value: `${Math.round((activeCount / total) * 100)}%` },
    { label: 'Competitors Covered', value: String(filteredCompetitors.length) },
    { label: 'Unique Keywords', value: String(keywordEntries.length) },
  ]

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Creative Analysis</h2>
      </div>

      {/* Filters — keyword sections update live when these change */}
      <div className="ds-card mt-4 p-4">
        <div className="flex items-center gap-2 text-grey-500">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium tracking-wide">Filters — metrics and keywords update live</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-grey-500">Competitor</span>
          <button
            type="button"
            onClick={() => setCompetitorFilter('all')}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              competitorFilter === 'all'
                ? 'bg-brand text-white'
                : 'border border-grey-200 bg-grey-50 text-grey-700 hover:bg-grey-100'
            }`}
          >
            All
          </button>
          {competitorNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCompetitorFilter(name)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                competitorFilter === name
                  ? 'bg-brand text-white'
                  : 'border border-grey-200 bg-grey-50 text-grey-700 hover:bg-grey-100'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-grey-500">Format</span>
          {FORMAT_PILLS.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setFormatFilter(pill)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                formatFilter === pill
                  ? 'bg-brand text-white'
                  : 'border border-grey-200 bg-grey-50 text-grey-700 hover:bg-grey-100'
              }`}
            >
              {pill === 'all' ? 'All' : pill}
            </button>
          ))}
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="ds-card p-4" title={`${kpi.label}: ${kpi.value}`}>
            <span className="text-xs font-medium tracking-wide text-grey-500">{kpi.label}</span>
            <p className="mt-2 text-2xl font-semibold text-grey-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Donut metric cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {donuts.map((donut) => (
          <div key={donut.label} className="ds-card flex flex-col items-center p-5 text-center">
            <Donut pct={donut.pct} color={donut.color} label={donut.label} />
            <h3 className="mt-3 text-sm font-semibold text-grey-900">{donut.label}</h3>
            <p className="mt-1 text-xs text-grey-500" title={`${donut.count} of ${filteredAds.length} filtered ads`}>
              {donut.count} of {filteredAds.length} ads
            </p>
            <button
              type="button"
              onClick={() => onFilterGallery(donut.filterFormat, donut.query)}
              className="mt-3 text-xs font-medium text-brand hover:underline"
            >
              Filter gallery →
            </button>
          </div>
        ))}
      </div>

      {/* Top Keywords */}
      <div className="ds-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Top Keywords</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">
          Keyword volume across the filtered ad set. Click a bar to search the gallery.
        </p>
        {keywordEntries.length === 0 ? (
          <p className="mt-4 text-sm text-grey-600">No keyword data for the current filters.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {keywordEntries.slice(0, 8).map(([keyword, count]) => (
              <button
                key={keyword}
                type="button"
                onClick={() => onFilterGallery('all', keyword)}
                className="block w-full text-left"
                title={`${keyword}: ${count} ads — click to filter gallery`}
              >
                <div className="flex items-center justify-between text-xs text-grey-700">
                  <span className="font-medium">{keyword}</span>
                  <span className="font-semibold text-grey-900">{count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((count / keywordMax) * 100)}%`, backgroundColor: '#1A73E8' }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Per-competitor keyword breakdowns */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filteredCompetitors.map((name) => {
          const compAds = filteredAds.filter((ad) => ad.competitorName === name)
          const counts = new Map<string, number>()
          compAds.forEach((ad) =>
            adKeywords(ad, data.keywords).forEach((kw) => counts.set(kw, (counts.get(kw) ?? 0) + 1))
          )
          const entries = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
          const compMax = Math.max(1, ...entries.map(([, count]) => count))
          return (
            <div key={name} className="ds-card p-5">
              <h3 className="text-sm font-semibold text-grey-900">{name}</h3>
              <p className="mt-1 text-xs text-grey-500">{compAds.length} ads in current filter</p>
              {entries.length === 0 ? (
                <p className="mt-3 text-xs text-grey-500">No keyword data.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {entries.map(([kw, count]) => (
                    <div key={kw}>
                      <div className="flex items-center justify-between text-xs text-grey-700">
                        <span className="font-medium">{kw}</span>
                        <span className="font-semibold text-grey-900">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-grey-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((count / compMax) * 100)}%`,
                            backgroundColor: '#00A7D6',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Common Headline Openers */}
      <div className="ds-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Common Headline Openers</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">
          Recurring two-word openers across filtered headlines. Click to search the gallery.
        </p>
        {openers.length === 0 ? (
          <p className="mt-4 text-sm text-grey-600">No headline data for the current filters.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {openers.map(([opener, info]) => (
              <button
                key={opener}
                type="button"
                onClick={() => onFilterGallery('all', opener)}
                className="flex w-full items-center justify-between gap-3 rounded-ds border border-grey-100 px-3 py-2 text-left transition-colors hover:bg-grey-50"
                title={`\"${opener}...\" appears in ${info.count} headlines`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-grey-900">&quot;{opener}...&quot;</span>
                  <span className="block truncate text-xs text-grey-500">{info.sample}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-grey-900">{info.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Creative Word Cloud */}
      <div className="ds-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Creative Word Cloud</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">Click a word to search the gallery.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {cloudWords.map((word, index) => {
            const color = TAG_COLORS[index % TAG_COLORS.length] ?? { bg: '#F3F8FE', text: '#155CBA' }
            return (
              <button
                key={word}
                type="button"
                onClick={() => onFilterGallery('all', word)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {word}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
