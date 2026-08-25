import {
  Activity,
  AlertTriangle,
  BarChart3,
  Eye,
  Image as ImageIcon,
  Lightbulb,
  MousePointerClick,
  Target,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react'
import type { AdsDashboardData, SignalType } from '@/lib/types'

interface AdsDashboardProps {
  data: AdsDashboardData
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const signalBadgeStyles: Record<SignalType, string> = {
  Opportunity: 'bg-success-surface text-success-deep',
  Trend: 'bg-brand-surface text-brand',
  Alert: 'bg-errords-surface text-errords-deep',
  Watch: 'bg-warning-surface text-warning-deep',
}

// Keyword Battlefield tag-cloud styling (DS graphic surface/text pairs)
const BATTLEFIELD_TAGS: Array<{ bg: string; text: string }> = [
  { bg: '#F3F8FE', text: '#1A73E8' },
  { bg: '#FFF9F5', text: '#C96737' },
  { bg: '#FBF7FD', text: '#8F50AC' },
  { bg: '#F2FBFD', text: '#0086AB' },
  { bg: '#FDFCF3', text: '#B29E0E' },
  { bg: '#FFF7F9', text: '#C64272' },
  { bg: '#F5FCF9', text: '#2FA06A' },
]

const KEYWORD_SIZES = ['text-base', 'text-xs', 'text-sm', 'text-xs', 'text-sm']

function SignalIcon({ type }: { type: SignalType }) {
  if (type === 'Opportunity') return <Lightbulb className="h-4 w-4" />
  if (type === 'Trend') return <TrendingUp className="h-4 w-4" />
  if (type === 'Alert') return <AlertTriangle className="h-4 w-4" />
  return <Eye className="h-4 w-4" />
}

export default function AdsDashboard({ data }: AdsDashboardProps) {
  const heatMax = Math.max(1, ...data.heatmap.flatMap((row) => row.monthly))
  const themeMax = Math.max(1, ...data.themes.map((t) => t.frequency))
  const ctaArsenalMax = Math.max(1, ...data.ctas.map((c) => c.count))

  // Dynamic date range labels: 7-day, 30-day, or monthly view depending on the fetched data
  const heatLabels = data.heatmapLabels && data.heatmapLabels.length > 0 ? data.heatmapLabels : MONTHS

  // Self company (primary target) is always displayed first in scorecards
  const orderedScorecards = [...data.scorecards].sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0))

  // Absolute number of active ads across the tracked set (not a percentage)
  const activeAdsTotal = data.scorecards.reduce((sum, card) => sum + card.activeAds, 0)

  const kpiCards = [
    { label: 'Total Ads Tracked', value: String(data.kpis.totalAds), icon: BarChart3 },
    { label: 'Active Ads', value: String(activeAdsTotal), icon: Activity },
    { label: 'Image Creatives', value: String(data.kpis.imageCreatives), icon: ImageIcon },
    { label: 'Video Creatives', value: String(data.kpis.videoCreatives), icon: Video },
    { label: 'Competitors', value: String(data.kpis.competitorCount), icon: Users },
  ]

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Market Insights</h2>
      </div>

      {/* KPI Summary Cards */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* Competitor Scorecards — self company first */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {orderedScorecards.map((card) => (
          <div key={card.competitorId} className="ds-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-grey-900">{card.name}</h3>
                  {card.isSelf && (
                    <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-xs text-grey-500">{card.domain}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  card.status === 'LIVE'
                    ? 'bg-success-surface text-success-deep'
                    : 'bg-grey-100 text-grey-600'
                }`}
                title={`Ad status: ${card.status}`}
              >
                {card.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-grey-700">
              <span>
                <span className="font-semibold text-grey-900">{card.activeAds}</span> active
              </span>
              <span className="text-grey-300">/</span>
              <span>
                <span className="font-semibold text-grey-900">{card.totalAds}</span> total ads
              </span>
            </div>
            <div className="mt-4">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-grey-100">
                <div
                  style={{ width: `${card.formatMix.image}%`, backgroundColor: '#1A73E8' }}
                  title={`Image: ${card.formatMix.image}% of ${card.name} creatives`}
                />
                <div
                  style={{ width: `${card.formatMix.text}%`, backgroundColor: '#DFC612' }}
                  title={`Text: ${card.formatMix.text}% of ${card.name} creatives`}
                />
                <div
                  style={{ width: `${card.formatMix.video}%`, backgroundColor: '#F8528F' }}
                  title={`Video: ${card.formatMix.video}% of ${card.name} creatives`}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-grey-600">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#1A73E8' }} />
                  Image {card.formatMix.image}%
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#DFC612' }} />
                  Text {card.formatMix.text}%
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#F8528F' }} />
                  Video {card.formatMix.video}%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-grey-600">
                <span className="font-medium">Market Intensity</span>
                <span className="font-semibold text-grey-900">{card.marketIntensity}</span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100"
                title={`Market intensity: ${card.marketIntensity} / 100`}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${card.marketIntensity}%`, backgroundColor: '#FB8145' }}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.headlineWords.map((word) => (
                <span
                  key={`${card.competitorId}-${word}`}
                  className="inline-flex items-center rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand"
                  title={`Frequent headline word: ${word}`}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ad Activity Pulse Heatmap — dynamic date range */}
      <div className="ds-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-grey-600" />
          <h3 className="text-base font-semibold text-grey-900">Ad Activity Pulse</h3>
        </div>
        <p className="mt-1 text-xs text-grey-500">Ad density per competitor across the detected date range.</p>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex items-center gap-1 pl-32">
              {heatLabels.map((label, labelIndex) => (
                <span
                  key={`${label}-${labelIndex}`}
                  className="flex-1 text-center text-[10px] font-medium uppercase text-grey-500"
                >
                  {label}
                </span>
              ))}
            </div>
            {data.heatmap.map((row) => (
              <div key={row.competitorName} className="mt-1 flex items-center gap-1">
                <span className="w-32 shrink-0 truncate pr-2 text-xs font-medium text-grey-700">
                  {row.competitorName}
                </span>
                {row.monthly.map((value, bucketIndex) => (
                  <div
                    key={`${row.competitorName}-${bucketIndex}`}
                    className="h-6 flex-1 rounded-sm"
                    style={{
                      backgroundColor: `rgba(26, 115, 232, ${
                        value === 0 ? 0.06 : 0.15 + 0.7 * (value / heatMax)
                      })`,
                    }}
                    title={`${row.competitorName} — ${heatLabels[bucketIndex] ?? ''}: ${value} ads`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyword Battlefield & CTA Arsenal — inserted above Messaging Themes / Strategic Signals */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">Keyword Battlefield</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Top search terms competitors are fighting over.</p>
          {data.keywords.length === 0 ? (
            <p className="mt-4 text-xs text-grey-500">No keyword data detected for this analysis.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data.keywords.map((keyword, index) => {
                const tone = BATTLEFIELD_TAGS[index % BATTLEFIELD_TAGS.length] ?? { bg: '#F3F8FE', text: '#1A73E8' }
                const size = KEYWORD_SIZES[index % KEYWORD_SIZES.length] ?? 'text-sm'
                return (
                  <span
                    key={keyword}
                    className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${size}`}
                    style={{ backgroundColor: tone.bg, color: tone.text }}
                    title={`Contested keyword: ${keyword}`}
                  >
                    {keyword}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">CTA Arsenal</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Most-used calls-to-action across the competitive set.</p>
          {data.ctas.length === 0 ? (
            <p className="mt-4 text-xs text-grey-500">No CTA data detected for this analysis.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.ctas.map((cta) => (
                <div key={cta.label}>
                  <div className="flex items-center justify-between text-xs text-grey-700">
                    <span className="font-medium">{cta.label}</span>
                    <span className="font-semibold text-grey-900">{cta.count}</span>
                  </div>
                  <div
                    className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100"
                    title={`${cta.label}: used in ${cta.count} ads`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((cta.count / ctaArsenalMax) * 100)}%`,
                        backgroundColor: '#1A73E8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messaging Themes & Strategic Signals */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">Messaging Themes</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Top recurring ad angles across the competitive set.</p>
          <div className="mt-4 space-y-3">
            {data.themes.map((theme) => (
              <div key={theme.theme}>
                <div className="flex items-center justify-between text-xs text-grey-700">
                  <span className="font-medium">{theme.theme}</span>
                  <span className="font-semibold text-grey-900">{theme.frequency}</span>
                </div>
                <div
                  className="mt-1 h-2 w-full overflow-hidden rounded-full bg-grey-100"
                  title={`${theme.theme}: ${theme.frequency} ads`}
                >
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
        <div className="ds-card p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-grey-600" />
            <h3 className="text-base font-semibold text-grey-900">Strategic Signals</h3>
          </div>
          <p className="mt-1 text-xs text-grey-500">Automated reads on competitor strategy shifts.</p>
          <div className="mt-4 space-y-3">
            {data.signals.map((signal) => (
              <div key={signal.title} className="flex items-start gap-3 rounded-ds border border-grey-100 p-3">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${signalBadgeStyles[signal.type]}`}
                >
                  <SignalIcon type={signal.type} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${signalBadgeStyles[signal.type]}`}
                    >
                      {signal.type}
                    </span>
                    <h4 className="text-sm font-semibold text-grey-900">{signal.title}</h4>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-grey-600">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
