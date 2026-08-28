"use client"

import { FileText, MessageSquareText, Palette, Quote, Target } from 'lucide-react'
import type { AdFormat, CompetitorAd } from '@/lib/types'
import { deriveAdFormat } from '@/components/AdCard'

interface CreativeAnalysisProps {
  ads: CompetitorAd[]
  onFilterGallery: (format: 'all' | AdFormat, query: string) => void
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'your', 'you', 'our', 'that', 'this', 'from', 'are',
  'has', 'have', 'more', 'into', 'can', 'get', 'its', 'new', 'now', 'all', 'out', 'here',
])

const KEYWORD_COLORS = ['#1A73E8', '#FB8145', '#B364D7', '#00A7D6', '#DFC612', '#F8528F', '#3BC884', '#6D717F']

const TAG_TONES: Array<{ bg: string; text: string }> = [
  { bg: '#F3F8FE', text: '#1A73E8' },
  { bg: '#FFF9F5', text: '#C96737' },
  { bg: '#FBF7FD', text: '#8F50AC' },
  { bg: '#F2FBFD', text: '#0086AB' },
  { bg: '#FDFCF3', text: '#B29E0E' },
  { bg: '#FFF7F9', text: '#C64272' },
  { bg: '#F5FCF9', text: '#2FA06A' },
]

const TAG_SIZES = ['text-base', 'text-xs', 'text-sm']

export default function CreativeAnalysis({ ads, onFilterGallery }: CreativeAnalysisProps) {
  const totalAds = ads.length

  /* (image 1) Donut summary cards — computed from the real ads array */
  const imageCount = ads.filter((ad) => deriveAdFormat(ad) === 'image').length
  const videoCount = ads.filter((ad) => deriveAdFormat(ad) === 'video').length
  const ctaCount = ads.filter((ad) => Boolean(ad.cta && ad.cta.trim())).length
  const keywordAdCount = ads.filter((ad) => (ad.keywords?.length ?? 0) > 0).length
  const donuts: Array<{ label: string; count: number; color: string }> = [
    { label: 'Have Image Creative', count: imageCount, color: '#1A73E8' },
    { label: 'Have Video Creative', count: videoCount, color: '#F8528F' },
    { label: 'Have Clear CTA', count: ctaCount, color: '#3BC884' },
    { label: 'Have Keyword Data', count: keywordAdCount, color: '#B364D7' },
  ]

  /* Per-competitor total ad counts — powers the "View all X ads" buttons */
  const competitorAdCounts = new Map<string, number>()
  ads.forEach((ad) => {
    competitorAdCounts.set(ad.competitorName, (competitorAdCounts.get(ad.competitorName) ?? 0) + 1)
  })

  /* (image 2) Per-competitor keyword drill-down from real per-ad keyword data */
  const overallKeywordCounts = new Map<string, number>()
  const competitorKeywordMap = new Map<string, Map<string, number>>()
  ads.forEach((ad) => {
    const kws = ad.keywords ?? []
    const perComp = competitorKeywordMap.get(ad.competitorName) ?? new Map<string, number>()
    competitorKeywordMap.set(ad.competitorName, perComp)
    if (kws.length === 0) return
    kws.forEach((k) => {
      overallKeywordCounts.set(k, (overallKeywordCounts.get(k) ?? 0) + 1)
      perComp.set(k, (perComp.get(k) ?? 0) + 1)
    })
  })
  const topKeywords = Array.from(overallKeywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  const topKeywordTotal = Math.max(1, topKeywords.reduce((sum, entry) => sum + entry.count, 0))
  const competitorKeywordColumns = Array.from(competitorKeywordMap.entries()).map(([name, counts]) => ({
    name,
    keywords: Array.from(counts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  }))

  /* (image 3) Messaging Language tag cloud — real headline/copy word ad-counts */
  const wordAdCounts = new Map<string, number>()
  ads.forEach((ad) => {
    const combined = `${ad.headline} ${ad.copy}`.toLowerCase()
    const seen = new Set<string>()
    combined.split(/[^a-z0-9+]+/).forEach((word) => {
      if (word.length < 4 || STOP_WORDS.has(word)) return
      seen.add(word)
    })
    seen.forEach((word) => wordAdCounts.set(word, (wordAdCounts.get(word) ?? 0) + 1))
  })
  const messagingWords = Array.from(wordAdCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)

  /* (image 3) Common Headline Openers — first two words of each real headline */
  const openerCounts = new Map<string, number>()
  ads.forEach((ad) => {
    const words = ad.headline.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return
    const opener = words.slice(0, 2).join(' ')
    openerCounts.set(opener, (openerCounts.get(opener) ?? 0) + 1)
  })
  const topOpeners = Array.from(openerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)

  /* (image 4) Unique headlines per competitor — pulled from each competitor's ads */
  const competitorHeadlineMap = new Map<string, string[]>()
  ads.forEach((ad) => {
    const list = competitorHeadlineMap.get(ad.competitorName) ?? []
    const headline = ad.headline.trim()
    if (headline && !list.includes(headline)) list.push(headline)
    competitorHeadlineMap.set(ad.competitorName, list)
  })
  const headlineColumns = Array.from(competitorHeadlineMap.entries()).map(([name, headlines]) => ({
    name,
    headlines,
  }))

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
        <>
          {/* (image 1) Summary donut cards */}
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {donuts.map((donut) => {
              const pct = totalAds > 0 ? Math.round((donut.count / totalAds) * 100) : 0
              return (
                <div key={donut.label} className="ds-card p-4" title={`${donut.label}: ${donut.count} of ${totalAds} ads`}>
                  <p className="text-xs font-medium tracking-wide text-grey-500">{donut.label}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <svg viewBox="0 0 36 36" className="h-16 w-16 shrink-0">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#EFF0F2" strokeWidth="3.5" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke={donut.color}
                        strokeWidth="3.5"
                        strokeDasharray={`${pct}, 100`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                      />
                    </svg>
                    <div>
                      <p className="text-xl font-semibold text-grey-900">{pct}%</p>
                      <p className="text-xs text-grey-500">
                        {donut.count} of {totalAds} ads
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* (image 2) Keyword drill-down */}
          <div className="ds-card mt-4 p-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">Top Keywords</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">
              Keyword data from the fetched ads. Click a keyword to search the gallery.
            </p>
            {topKeywords.length === 0 ? (
              <p className="mt-4 text-xs text-grey-500">No keyword data detected for this analysis.</p>
            ) : (
              <>
                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-grey-100">
                  {topKeywords.map((entry, index) => (
                    <div
                      key={entry.keyword}
                      style={{
                        width: `${Math.round((entry.count / topKeywordTotal) * 100)}%`,
                        backgroundColor: KEYWORD_COLORS[index % KEYWORD_COLORS.length] ?? '#1A73E8',
                      }}
                      title={`${entry.keyword}: ${entry.count} mentions`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-grey-600">
                  {topKeywords.map((entry, index) => (
                    <button
                      key={entry.keyword}
                      type="button"
                      onClick={() => onFilterGallery('all', entry.keyword)}
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-brand"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: KEYWORD_COLORS[index % KEYWORD_COLORS.length] ?? '#1A73E8' }}
                      />
                      {entry.keyword}
                      <span className="font-semibold text-grey-900">{entry.count}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {/* Competitor keyword drill-down — one column per competitor with
                clickable keyword bars and a "View all X ads" button that filters
                the Ad Gallery to that competitor. */}
            {competitorKeywordColumns.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {competitorKeywordColumns.map((column) => {
                  const columnMax = Math.max(1, ...column.keywords.map((k) => k.count))
                  const columnAdTotal = competitorAdCounts.get(column.name) ?? 0
                  return (
                    <div key={column.name} className="flex flex-col rounded-xl border border-grey-100 p-4">
                      <p className="truncate text-sm font-semibold text-grey-900">{column.name}</p>
                      <div className="mt-3 flex-1 space-y-2">
                        {column.keywords.map((entry) => (
                          <button
                            key={`${column.name}-${entry.keyword}`}
                            type="button"
                            onClick={() => onFilterGallery('all', entry.keyword)}
                            className="block w-full cursor-pointer text-left"
                            title={`Search the gallery for \"${entry.keyword}\"`}
                          >
                            <div className="flex items-center justify-between text-xs text-grey-700">
                              <span className="truncate font-medium">{entry.keyword}</span>
                              <span className="font-semibold text-grey-900">{entry.count}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-grey-100">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round((entry.count / columnMax) * 100)}%`,
                                  backgroundColor: '#1A73E8',
                                }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onFilterGallery('all', column.name)}
                        className="mt-3 w-full cursor-pointer rounded-lg border border-grey-200 px-3 py-2 text-center text-xs font-semibold text-brand transition-colors hover:bg-brand-surface"
                        title={`View all ${columnAdTotal} ads from ${column.name} in the Ad Gallery`}
                      >
                        View all {columnAdTotal} ads
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* (image 3) Messaging Language + Common Headline Openers */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="ds-card p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-grey-600" />
                <h3 className="text-base font-semibold text-grey-900">Messaging Language</h3>
              </div>
              <p className="mt-1 text-xs text-grey-500">Words used across the tracked headlines and copy. Click to search the gallery.</p>
              {messagingWords.length === 0 ? (
                <p className="mt-4 text-xs text-grey-500">No messaging data detected.</p>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {messagingWords.map(([word, count], index) => {
                    const tone = TAG_TONES[index % TAG_TONES.length] ?? { bg: '#F3F8FE', text: '#1A73E8' }
                    const size = TAG_SIZES[index % TAG_SIZES.length] ?? 'text-sm'
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => onFilterGallery('all', word)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 font-medium ${size}`}
                        style={{ backgroundColor: tone.bg, color: tone.text }}
                        title={`Appears in ${count} ads`}
                      >
                        {word}
                        <span className="opacity-70">{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="ds-card p-5">
              <div className="flex items-center gap-2">
                <Quote className="h-5 w-5 text-grey-600" />
                <h3 className="text-base font-semibold text-grey-900">Common Headline Openers</h3>
              </div>
              <p className="mt-1 text-xs text-grey-500">First words competitors lead with. Click to search the gallery.</p>
              {topOpeners.length === 0 ? (
                <p className="mt-4 text-xs text-grey-500">No headline data detected.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {topOpeners.map(([opener, count]) => (
                    <button
                      key={opener}
                      type="button"
                      onClick={() => onFilterGallery('all', opener)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-grey-100 px-3 py-2 text-left transition-colors hover:bg-grey-50"
                      title={`Used to open ${count} headlines`}
                    >
                      <span className="truncate text-xs font-medium text-grey-700">{opener}</span>
                      <span className="ml-2 shrink-0 text-xs font-semibold text-grey-900">{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* (image 4) Headlines by competitor */}
          <div className="ds-card mt-4 p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-grey-600" />
              <h3 className="text-base font-semibold text-grey-900">Headlines by Competitor</h3>
            </div>
            <p className="mt-1 text-xs text-grey-500">Unique headlines pulled from each tracked company. Click to find in gallery.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {headlineColumns.map((column) => (
                <div key={column.name} className="rounded-xl border border-grey-100 p-4">
                  <p className="truncate text-sm font-semibold text-grey-900">{column.name}</p>
                  <ul className="mt-3 space-y-2">
                    {column.headlines.slice(0, 8).map((headline) => (
                      <li key={`${column.name}-${headline}`}>
                        <button
                          type="button"
                          onClick={() => onFilterGallery('all', headline)}
                          className="flex w-full cursor-pointer items-start gap-2 text-left text-xs leading-5 text-grey-700 transition-colors hover:text-brand"
                        >
                          <Quote className="mt-0.5 h-3 w-3 shrink-0 text-grey-400" />
                          <span>{headline}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
