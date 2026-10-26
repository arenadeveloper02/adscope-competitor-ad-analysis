"use client"

import { useEffect, useRef, useState } from 'react'
import { Megaphone, Search, Users } from 'lucide-react'
import type {
  AdFormat,
  AdsDashboardData,
  Competitor,
  CompetitorAd,
  DashboardTab,
  SnapshotPayload,
} from '@/lib/types'
import { logAnalysis, searchCompetitors } from '@/lib/actions'
import { fetchDashboardData } from '@/lib/dashboard-actions'
import { getLastAnalyzedDomain } from '@/lib/session-actions'
import { loadDashboardSnapshot, saveDashboardSnapshot } from '@/lib/snapshot-actions'
import { useArenaEmailId } from '@/components/arena-email-provider'
import AddCompetitorModal from '@/components/AddCompetitorModal'
import AdGallery from '@/components/AdGallery'
import AdDetailModal from '@/components/AdDetailModal'
import AdsDashboard from '@/components/AdsDashboard'
import CompetitorIntel from '@/components/CompetitorIntel'
import CompetitorsTable from '@/components/CompetitorsTable'
import CreativeAnalysis from '@/components/CreativeAnalysis'
import Spinner from '@/components/Spinner'
import TopNav from '@/components/TopNav'

function cleanDomainInput(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: 'insights', label: 'Market Insights' },
  { id: 'gallery', label: 'Ad Gallery' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'creative', label: 'Creative Analysis' },
]

/** API 1 — Competitor Intelligence Agent Final (trigger) workflow */
const ADS_TRIGGER_ENDPOINT =
  'https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute'

const ADS_TRIGGER_API_KEY = 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls'

const LONG_RUN_MESSAGE =
  'Analyzing competitor ads... This process takes 8-12 minutes. Please keep this tab open, or refresh the page later to view your results.'

const POLL_INTERVAL_MS = 20000
const MAX_RUN_MS = 15 * 60 * 1000

/** True when API 1 responds with { success: true, output: { result: { status: 'success' } } } */
function isTriggerSuccess(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const record = payload as Record<string, unknown>
  if (record.success !== true) return false
  const output = record.output
  if (typeof output !== 'object' || output === null) return false
  const result = (output as Record<string, unknown>).result
  if (typeof result !== 'object' || result === null) return false
  return (result as Record<string, unknown>).status === 'success'
}

export default function DashboardClient() {
  const emailId = useArenaEmailId()

  const [domain, setDomain] = useState('')
  const [domainError, setDomainError] = useState('')
  const [apiError, setApiError] = useState('')
  const [adsError, setAdsError] = useState('')
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [ads, setAds] = useState<CompetitorAd[]>([])
  const [dashboard, setDashboard] = useState<AdsDashboardData | null>(null)
  const [isFetchingCompetitors, setIsFetchingCompetitors] = useState(false)
  const [isFetchingAds, setIsFetchingAds] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasFetchedAds, setHasFetchedAds] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAd, setSelectedAd] = useState<CompetitorAd | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>('insights')
  const [gallerySearch, setGallerySearch] = useState('')
  const [galleryFormat, setGalleryFormat] = useState<'all' | AdFormat>('all')
  const [competitorFocus, setCompetitorFocus] = useState({ name: '', nonce: 0 })
  // Re-displays the competitor selection table after the dashboard has loaded
  const [isPickingMore, setIsPickingMore] = useState(false)
  // Competitors temporarily excluded from the dashboard analysis view.
  const [inactiveCompetitorIds, setInactiveCompetitorIds] = useState<string[]>([])
  // Refresh loading state — true while the saved analysis is being restored
  const [isRestoring, setIsRestoring] = useState(true)

  const isHydratedRef = useRef(false)
  const domainRef = useRef('')
  const syncRunIdRef = useRef(0)
  const domainSectionRef = useRef<HTMLElement | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    domainRef.current = domain
  }, [domain])

  // Clear any pending polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current !== null) clearInterval(pollIntervalRef.current)
    }
  }, [])

  // Restore persisted session state on mount so refreshes do not wipe the analysis.
  // Phase 1: instant paint from the server-side snapshot (per emailId).
  // Phase 2: background refresh of the MOST RECENT run from the Get workflow.
  // A loading spinner (isRestoring) is shown until the existing database data loads.
  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      if (!emailId) {
        isHydratedRef.current = true
        setIsRestoring(false)
        return
      }
      let snapDomain = ''
      let snapCompetitors: Competitor[] = []
      let snapSelectedIds: string[] = []
      try {
        const result = await loadDashboardSnapshot(emailId)
        if (!cancelled && result.success && result.snapshot) {
          const snap = result.snapshot
          setDomain(snap.domain)
          setCompetitors(snap.competitors)
          setSelectedIds(snap.selectedIds)
          setAds(snap.ads)
          setDashboard(snap.dashboard)
          setHasSearched(snap.hasSearched)
          setHasFetchedAds(snap.hasFetchedAds)
          snapDomain = snap.domain
          snapCompetitors = snap.competitors
          snapSelectedIds = snap.selectedIds
        }
      } catch {
        // ignore restore failures — start with a clean slate
      }
      if (cancelled) return
      isHydratedRef.current = true

      // Phase 2: refresh the latest run from the Get workflow for this user.
      try {
        let restoreDomain = snapDomain.trim()
        if (!restoreDomain) {
          const lastDomain = await getLastAnalyzedDomain(emailId)
          if (lastDomain) restoreDomain = lastDomain
        }
        if (cancelled) return
        if (!restoreDomain) {
          setIsRestoring(false)
          return
        }
        const restoreRunId = syncRunIdRef.current
        const selectedCompetitors = snapCompetitors.filter((c) => snapSelectedIds.includes(c.id))
        const fresh = await fetchDashboardData(
          emailId,
          restoreDomain,
          selectedCompetitors.length > 0 ? selectedCompetitors : snapCompetitors
        )
        if (cancelled || syncRunIdRef.current !== restoreRunId) return
        if (fresh.success && fresh.dashboard) {
          if (!domainRef.current.trim() || domainRef.current.trim() === restoreDomain) {
            setDomain(restoreDomain)
          }
          setDashboard(fresh.dashboard)
          setAds(fresh.dashboard.ads)
          setInactiveCompetitorIds([])
          setHasSearched(true)
          setHasFetchedAds(true)
          if (snapCompetitors.length === 0) {
            const restoredCompetitors: Competitor[] = fresh.dashboard.scorecards
              .filter((card) => !card.isSelf)
              .map((card) => ({
                id: card.competitorId,
                name: card.name,
                domain: card.domain,
                matchScore: Math.min(100, Math.max(1, card.marketIntensity)),
              }))
            setCompetitors(restoredCompetitors)
            setSelectedIds(restoredCompetitors.map((c) => c.id))
          }
        }
      } catch {
        // keep whatever the snapshot restored — never surface errors on refresh
      } finally {
        if (!cancelled) setIsRestoring(false)
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [emailId])

  // Persist session state server-side keyed by emailId
  useEffect(() => {
    if (!isHydratedRef.current || !emailId || !hasSearched) return
    const payload: SnapshotPayload = {
      domain: domainRef.current,
      competitors,
      selectedIds,
      ads,
      dashboard,
      hasSearched,
      hasFetchedAds,
    }
    void saveDashboardSnapshot(emailId, payload)
  }, [emailId, competitors, selectedIds, ads, dashboard, hasSearched, hasFetchedAds])

  const handleListCompetitors = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isFetchingCompetitors) return
    const trimmed = domain.trim()
    if (!trimmed) {
      setDomainError('Please enter a domain URL to analyze.')
      return
    }
    setDomainError('')
    setApiError('')
    setIsFetchingCompetitors(true)
    void logAnalysis(trimmed, emailId)
    try {
      const result = await searchCompetitors(trimmed)
      if (result.success && result.competitors) {
        setCompetitors(result.competitors)
      } else {
        setCompetitors([])
        setApiError(result.error ?? 'Something went wrong while fetching competitors. Please try again.')
      }
      setSelectedIds([])
      setAds([])
      setDashboard(null)
      setAdsError('')
      setInactiveCompetitorIds([])
      setIsPickingMore(false)
      setHasFetchedAds(false)
      setHasSearched(true)
    } catch {
      setCompetitors([])
      setApiError('Something went wrong while fetching competitors. Please try again.')
      setSelectedIds([])
      setAds([])
      setDashboard(null)
      setAdsError('')
      setInactiveCompetitorIds([])
      setIsPickingMore(false)
      setHasFetchedAds(false)
      setHasSearched(true)
    } finally {
      setIsFetchingCompetitors(false)
    }
  }

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    // Any change to the competitor selection immediately re-surfaces the
    // "Get Ads for Selected" section so the workflow can be re-triggered
    setIsPickingMore(true)
  }

  const handleToggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === competitors.length ? [] : competitors.map((c) => c.id)
    )
    setIsPickingMore(true)
  }

  // Populates ALL dashboard state from a parsed Get-workflow result and
  // reveals the dashboard tabs.
  const populateDashboardFromGet = (fresh: AdsDashboardData) => {
    setDashboard(fresh)
    setAds(fresh.ads)
    setAdsError('')
    setInactiveCompetitorIds([])
    setIsPickingMore(false)
    setHasFetchedAds(true)
    setActiveTab('insights')
  }

  // Ads analysis flow:
  // STEP 1 fires API 1 (Final trigger workflow) with the exact payload
  // { companyName, email, competitorDetails: [{ company_domain_url,
  //   company_name, competitor_description, competitor_domain_url, name }] }.
  // STEP 2 IMMEDIATELY starts a setInterval that fires API 2 (Get workflow,
  // payload { email, company_name }) every 20 seconds and renders whatever
  // data is currently available in the database.
  // STEP 3 AWAITS API 1's response; when it returns
  // { success: true, output: { result: { status: 'success' } } } the interval
  // is cleared and API 2 is fired ONE final time to load the completed
  // dataset. The long-run message stays visible until that final call ends.
  const handleGetAdsForSelected = async () => {
    const selectedCompetitors = competitors.filter((c) => selectedIds.includes(c.id))
    if (!selectedCompetitors || selectedCompetitors.length === 0) return
    if (isFetchingAds) return

    const companyDomain = cleanDomainInput(domain) || selectedCompetitors[0]?.domain || 'unknown'
    const userEmail = emailId
    const runId = ++syncRunIdRef.current
    setIsFetchingAds(true)
    setAdsError('')
    setIsPickingMore(false)

    const startedAt = Date.now()
    const flags = { rendered: false, finished: false }

    const stopPolling = () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    const applyDashboard = (fresh: AdsDashboardData) => {
      if (!flags.rendered) {
        flags.rendered = true
        populateDashboardFromGet(fresh)
      } else {
        setDashboard(fresh)
        setAds(fresh.ads)
      }
    }

    // Fires API 2 ({ email, company_name }) and renders whatever data is
    // currently available in the database for this run.
    const renderAvailableData = async (isFinal: boolean) => {
      if (syncRunIdRef.current !== runId) return
      try {
        const fresh = await fetchDashboardData(userEmail, companyDomain, selectedCompetitors)
        if (syncRunIdRef.current !== runId) return
        if (!isFinal && flags.finished) return
        if (fresh.success && fresh.dashboard) {
          applyDashboard(fresh.dashboard)
        } else if (isFinal && !flags.rendered) {
          setAdsError(fresh.error ?? 'No ads data was found for this analysis. Please try again.')
        }
      } catch {
        if (isFinal && !flags.rendered && syncRunIdRef.current === runId) {
          setAdsError('Something went wrong while loading the ads data. Please try again.')
        }
      }
    }

    // STEP 2 — immediately start polling API 2 every 20 seconds while API 1 runs.
    stopPolling()
    pollIntervalRef.current = setInterval(() => {
      if (
        flags.finished ||
        syncRunIdRef.current !== runId ||
        Date.now() - startedAt > MAX_RUN_MS
      ) {
        stopPolling()
        return
      }
      void renderAvailableData(false)
    }, POLL_INTERVAL_MS)

    try {
      // STEP 1 — fire API 1 (Final trigger workflow) with the exact payload shape.
      const triggerResponse = await fetch(ADS_TRIGGER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ADS_TRIGGER_API_KEY,
        },
        body: JSON.stringify({
          companyName: companyDomain,
          email: userEmail,
          competitorDetails: selectedCompetitors.map((comp) => ({
            company_domain_url: companyDomain,
            company_name: companyDomain,
            competitor_description: comp.description || '',
            competitor_domain_url: comp.domain,
            name: comp.name,
          })),
        }),
      })

      // STEP 3 — API 1 responded: clear the 20s interval and fire API 2 one
      // final time to load the fully completed dataset.
      let triggerSucceeded = false
      if (triggerResponse.ok) {
        try {
          const payload: unknown = await triggerResponse.json()
          triggerSucceeded = isTriggerSuccess(payload)
        } catch {
          triggerSucceeded = false
        }
      }
      flags.finished = true
      stopPolling()
      if (syncRunIdRef.current !== runId) return
      await renderAvailableData(true)
      if (!flags.rendered && !triggerSucceeded && syncRunIdRef.current === runId) {
        setAdsError((prev) => prev || 'The ads analysis could not be completed. Please try again.')
      }
    } catch {
      flags.finished = true
      stopPolling()
      if (syncRunIdRef.current !== runId) return
      // Even when API 1 is unreachable, try to render whatever the DB has.
      await renderAvailableData(true)
      if (!flags.rendered && syncRunIdRef.current === runId) {
        setAdsError((prev) => prev || 'Unable to reach the ads analysis service. Please try again.')
      }
    } finally {
      if (syncRunIdRef.current === runId) setIsFetchingAds(false)
    }
  }

  const handleAddCompetitor = (competitor: Competitor) => {
    setCompetitors((prev) => [...prev, competitor])
    setSelectedIds((prev) => [...prev, competitor.id])
    setIsModalOpen(false)
    setIsPickingMore(true)
  }

  // Filters the Ad Gallery tab to a specific format/keyword and switches to it.
  const handleFilterGallery = (format: 'all' | AdFormat, query: string) => {
    setGalleryFormat(format)
    setGallerySearch(query)
    setActiveTab('gallery')
  }

  // Focuses a competitor inside the Competitors tab and switches to it.
  const handleOpenCompetitors = (competitorName: string) => {
    setCompetitorFocus({ name: competitorName, nonce: Date.now() })
    setActiveTab('competitors')
  }

  // TopNav checkbox toggles temporary exclusion from the dashboard view.
  const handleNavToggleCompetitor = (id: string) => {
    setInactiveCompetitorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const visibleAds = ads.filter((ad) => !inactiveCompetitorIds.includes(ad.competitorId))
  const visibleDashboard: AdsDashboardData | null = dashboard
    ? {
        ...dashboard,
        scorecards: dashboard.scorecards.filter(
          (card) => !inactiveCompetitorIds.includes(card.competitorId)
        ),
        heatmap: dashboard.heatmap.filter(
          (row) =>
            !dashboard.scorecards.some(
              (card) =>
                card.name === row.competitorName &&
                inactiveCompetitorIds.includes(card.competitorId)
            )
        ),
        ads: dashboard.ads.filter((ad) => !inactiveCompetitorIds.includes(ad.competitorId)),
      }
    : null

  return (
    <div className="min-h-screen bg-grey-50">
      <TopNav
        competitors={competitors}
        selectedIds={selectedIds.filter((id) => !inactiveCompetitorIds.includes(id))}
        hasFetchedAds={hasFetchedAds}
        onToggleCompetitor={handleNavToggleCompetitor}
        onAddCompetitor={() => setIsModalOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {isRestoring ? (
          // Refresh loading state — shown until the existing database data loads.
          <Spinner label="Loading your saved analysis…" />
        ) : (
          <>
            {/* Domain search */}
            <section ref={domainSectionRef} className="ds-card mt-6 p-6">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand" />
                <h1 className="text-lg font-semibold text-grey-900">Analyze a Domain</h1>
              </div>
              <p className="mt-1 text-sm text-grey-600">
                Enter a company domain to discover competitors and analyze their ads across platforms.
              </p>
              <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-500" />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => {
                      setDomain(e.target.value)
                      if (domainError) setDomainError('')
                    }}
                    placeholder="e.g. example.com"
                    className="h-11 w-full rounded-xl border border-grey-300 bg-white pl-11 pr-3 text-sm text-grey-900 placeholder:text-grey-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-600/20"
                    aria-label="Company domain"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isFetchingCompetitors}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFetchingCompetitors ? 'Searching…' : 'List Competitors'}
                </button>
              </form>
              {domainError && (
                <p className="mt-2 text-xs" style={{ color: '#F31A1A' }}>
                  {domainError}
                </p>
              )}
            </section>

            {apiError && (
              <div
                className="mt-4 rounded-xl border px-4 py-3 text-sm"
                style={{ backgroundColor: '#FFF3F3', borderColor: '#FAA3A3', color: '#921010' }}
                role="alert"
              >
                {apiError}
              </div>
            )}

            {isFetchingCompetitors && <Spinner label="Finding competitors…" />}

            {/* Competitor selection table + Get Ads trigger */}
            {hasSearched &&
              !isFetchingCompetitors &&
              competitors.length > 0 &&
              (!hasFetchedAds || isPickingMore) && (
                <section className="ds-card mt-6 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-grey-600" />
                      <h2 className="text-base font-semibold text-grey-900">
                        Competitors Found ({competitors.length})
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleGetAdsForSelected()}
                      disabled={selectedIds.length === 0 || isFetchingAds}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isFetchingAds
                        ? 'Analyzing…'
                        : `Get Ads for Selected (${selectedIds.length})`}
                    </button>
                  </div>
                  <CompetitorsTable
                    competitors={competitors}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    onToggleAll={handleToggleAll}
                  />
                </section>
              )}

            {/* Long-run message — visible from API 1 start until the final API 2 call completes */}
            {isFetchingAds && (
              <div className="ds-card mt-6 flex items-start gap-3 p-5" style={{ backgroundColor: '#F3F8FE', border: '1px solid #A3C7F6' }}>
                <div
                  className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-grey-200"
                  style={{ borderTopColor: '#1A73E8' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-grey-900">Ads analysis in progress</p>
                  <p className="mt-1 text-sm text-grey-700">{LONG_RUN_MESSAGE}</p>
                </div>
              </div>
            )}

            {adsError && !isFetchingAds && (
              <div
                className="mt-4 rounded-xl border px-4 py-3 text-sm"
                style={{ backgroundColor: '#FFF3F3', borderColor: '#FAA3A3', color: '#921010' }}
                role="alert"
              >
                {adsError}
              </div>
            )}

            {/* Dashboard tabs */}
            {hasFetchedAds && visibleDashboard && (
              <>
                <nav className="sticky top-16 z-30 mt-6 border-b border-grey-200 bg-grey-50/95 backdrop-blur">
                  <div className="flex gap-1 overflow-x-auto">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'border-brand text-brand'
                            : 'border-transparent text-grey-600 hover:text-grey-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </nav>

                {activeTab === 'insights' && <AdsDashboard data={visibleDashboard} />}

                {activeTab === 'gallery' && (
                  <AdGallery
                    ads={visibleAds}
                    search={gallerySearch}
                    format={galleryFormat}
                    onSearchChange={setGallerySearch}
                    onFormatChange={setGalleryFormat}
                    competitorCount={visibleDashboard.kpis.competitorCount}
                    onAdClick={(ad) => setSelectedAd(ad)}
                  />
                )}

                {activeTab === 'competitors' && (
                  <CompetitorIntel
                    data={visibleDashboard}
                    ads={visibleAds}
                    competitors={competitors}
                    onFindInGallery={(query) => handleFilterGallery('all', query)}
                    onAdClick={(ad) => setSelectedAd(ad)}
                    focusCompetitorName={competitorFocus.name}
                    focusNonce={competitorFocus.nonce}
                  />
                )}

                {activeTab === 'creative' && (
                  <CreativeAnalysis
                    ads={visibleAds}
                    onFilterGallery={handleFilterGallery}
                    onOpenCompetitors={handleOpenCompetitors}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <AddCompetitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCompetitor}
      />
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  )
}
