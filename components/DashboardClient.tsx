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
  const [activeTab, setActiveTab] = useState<DashboardTab>('insights')
  const [gallerySearch, setGallerySearch] = useState('')
  const [galleryFormat, setGalleryFormat] = useState<'all' | AdFormat>('all')
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
  // A loading spinner (isRestoring) is shown until the existing DB data loads.
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
    const flags = { rendered: false, finalizing: false }

    const clearPolling = () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    const pollOnce = async (): Promise<void> => {
      if (syncRunIdRef.current !== runId) {
        return
      }
      if (Date.now() - startedAt > MAX_RUN_MS) {
        clearPolling()
        setIsFetchingAds(false)
        if (!flags.rendered) {
          setAdsError(
            'The analysis is taking longer than expected. Please refresh the page in a few minutes to view your results.'
          )
        }
        return
      }
      try {
        const result = await fetchDashboardData(userEmail, companyDomain, selectedCompetitors)
        if (syncRunIdRef.current !== runId || flags.finalizing) return
        if (result.success && result.dashboard) {
          flags.rendered = true
          // Render the currently available data while API 1 keeps running.
          setDashboard(result.dashboard)
          setAds(result.dashboard.ads)
          setInactiveCompetitorIds([])
          setHasFetchedAds(true)
        }
      } catch {
        // transient polling failure — try again on the next 20s tick
      }
    }

    const triggerPayload = {
      companyName: companyDomain,
      email: userEmail,
      competitorDetails: selectedCompetitors.map((comp) => ({
        company_domain_url: companyDomain,
        company_name: companyDomain,
        competitor_description: comp.description || '',
        competitor_domain_url: comp.domain,
        name: comp.name,
      })),
    }

    // STEP 1: fire API 1, then immediately begin the 20-second API 2 polling
    // while API 1 continues executing.
    const triggerRequest = fetch(ADS_TRIGGER_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': ADS_TRIGGER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(triggerPayload),
      cache: 'no-store',
    })
    clearPolling()
    pollIntervalRef.current = setInterval(() => {
      void pollOnce()
    }, POLL_INTERVAL_MS)

    // STEP 3: await API 1 and only then perform the final API 2 fetch.
    let triggerSucceeded = false
    try {
      const response = await triggerRequest
      if (response.ok) {
        const payload: unknown = await response.json()
        triggerSucceeded = isTriggerSuccess(payload)
      }
    } catch {
      // API 1 may time out at the browser/gateway while continuing server-side.
      // Keep the interval alive so available database data can still render.
    }
    if (syncRunIdRef.current !== runId) {
      return
    }
    if (!triggerSucceeded) return

    // Final API 2 trigger: stop polling and fetch the completed dataset.
    flags.finalizing = true
    clearPolling()
    try {
      const final = await fetchDashboardData(userEmail, companyDomain, selectedCompetitors)
      if (syncRunIdRef.current !== runId) return
      if (final.success && final.dashboard) {
        populateDashboardFromGet(final.dashboard)
      } else {
        setAdsError(final.error ?? 'No ads data was returned for this analysis. Please try again.')
      }
    } catch {
      if (syncRunIdRef.current === runId) {
        setAdsError('Something went wrong while fetching the completed ads data. Please try again.')
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

  const handleOpenAddCompetitor = () => {
    setIsModalOpen(true)
    setIsPickingMore(true)
    domainSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleFilterGallery = (format: 'all' | AdFormat, query: string) => {
    setGalleryFormat(format)
    setGallerySearch(query)
    setActiveTab('gallery')
  }

  const handleFindInGallery = (query: string) => {
    handleFilterGallery('all', query)
  }

  // Derived dashboard view — filters out temporarily inactive competitors
  // WITHOUT mutating the fetched dashboard data.
  const viewDashboard: AdsDashboardData | null = (() => {
    if (!dashboard) return null
    if (inactiveCompetitorIds.length === 0) return dashboard
    const inactive = new Set(inactiveCompetitorIds)
    const scorecards = dashboard.scorecards.filter((s) => !inactive.has(s.competitorId))
    const names = new Set(scorecards.map((s) => s.name))
    return {
      ...dashboard,
      scorecards,
      heatmap: dashboard.heatmap.filter((row) => names.has(row.competitorName)),
      ads: dashboard.ads.filter((ad) => !inactive.has(ad.competitorId)),
    }
  })()

  const showCompetitorTable =
    hasSearched && !isFetchingCompetitors && competitors.length > 0 && (!hasFetchedAds || isPickingMore)

  return (
    <div className="min-h-screen">
      <TopNav
        competitors={competitors}
        selectedIds={selectedIds}
        hasFetchedAds={hasFetchedAds}
        onToggleCompetitor={handleToggle}
        onAddCompetitor={handleOpenAddCompetitor}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* Domain search */}
        <section ref={domainSectionRef} className="ds-card mt-6 p-6">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand" />
            <h1 className="text-lg font-semibold text-grey-900">Analyze a domain</h1>
          </div>
          <p className="mt-1 text-sm text-grey-600">
            Enter your company domain to discover competitors and analyze their ads across platforms.
          </p>
          <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
              <input
                type="text"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value)
                  if (domainError) setDomainError('')
                }}
                placeholder="e.g. yourcompany.com"
                className="h-11 w-full rounded-xl border border-grey-200 pl-9 pr-3 text-sm text-grey-900 placeholder:text-grey-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/30"
                aria-label="Company domain"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-medium text-white transition duration-200 hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!domain.trim() || isFetchingCompetitors}
            >
              <Search className="h-4 w-4" />
              {isFetchingCompetitors ? 'Analyzing…' : 'List Competitors'}
            </button>
          </form>
          {domainError && (
            <p className="mt-2 text-xs" style={{ color: '#F31A1A' }}>
              {domainError}
            </p>
          )}
          {apiError && (
            <p className="mt-2 text-xs" style={{ color: '#F31A1A' }}>
              {apiError}
            </p>
          )}
        </section>

        {/* Refresh loading state — shown until the saved analysis is restored */}
        {isRestoring && !isFetchingCompetitors && (
          <Spinner label="Loading your saved analysis…" />
        )}

        {isFetchingCompetitors && <Spinner label="Finding competitors for this domain…" />}

        {showCompetitorTable && (
          <section className="ds-card mt-6 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-grey-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <h2 className="text-base font-semibold text-grey-900">
                  Competitors found ({competitors.length})
                </h2>
              </div>
              <button
                type="button"
                className="ds-btn-secondary !border-transparent !bg-brand-600 !text-white hover:!bg-brand-700 active:!bg-brand-800"
                onClick={() => setIsModalOpen(true)}
              >
                + Add Competitor
              </button>
            </div>
            <CompetitorsTable
              competitors={competitors}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
            <div className="flex flex-col gap-3 border-t border-grey-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-grey-500">{selectedIds.length} selected</p>
              <button
                type="button"
                className="ds-btn-primary !bg-brand-600 !text-white hover:!bg-brand-700 active:!bg-brand-800"
                onClick={() => void handleGetAdsForSelected()}
                disabled={selectedIds.length === 0 || isFetchingAds}
              >
                Get Ads for Selected ({selectedIds.length})
              </button>
            </div>
          </section>
        )}

        {/* Long-run loading message — visible until the final API 2 call completes */}
        {isFetchingAds && <Spinner label={LONG_RUN_MESSAGE} />}

        {adsError && !isFetchingAds && (
          <div className="ds-card mt-6 p-6 text-center">
            <p className="text-sm font-medium" style={{ color: '#F31A1A' }}>
              {adsError}
            </p>
          </div>
        )}

        {hasFetchedAds && viewDashboard && (
          <>
            <div className="mt-8 flex flex-wrap gap-2 border-b border-grey-200">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-grey-600 hover:text-grey-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'insights' && <AdsDashboard data={viewDashboard} />}
            {activeTab === 'gallery' && (
              <AdGallery
                ads={viewDashboard.ads}
                search={gallerySearch}
                format={galleryFormat}
                onSearchChange={setGallerySearch}
                onFormatChange={setGalleryFormat}
                competitorCount={viewDashboard.kpis.competitorCount}
              />
            )}
            {activeTab === 'competitors' && (
              <CompetitorIntel
                data={viewDashboard}
                ads={viewDashboard.ads}
                competitors={competitors}
                onFindInGallery={handleFindInGallery}
              />
            )}
            {activeTab === 'creative' && (
              <CreativeAnalysis ads={viewDashboard.ads} onFilterGallery={handleFilterGallery} />
            )}
          </>
        )}
      </main>

      <AddCompetitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCompetitor}
      />
    </div>
  )
}
