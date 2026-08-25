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
  { id: 'competitors', label: 'Competitor Intel' },
  { id: 'creative', label: 'Creative Analysis' },
]

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
  // (triggered by the top header "+ Add Competitor" flow or any change made in
  // the header competitor checkbox dropdown)
  const [isPickingMore, setIsPickingMore] = useState(false)
  // Competitors temporarily excluded from the dashboard analysis view. Kept for
  // the derived-view filtering below; the underlying fetched dashboard data is
  // never mutated.
  const [inactiveCompetitorIds, setInactiveCompetitorIds] = useState<string[]>([])

  const isHydratedRef = useRef(false)
  const domainRef = useRef('')
  const syncRunIdRef = useRef(0)
  const domainSectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    domainRef.current = domain
  }, [domain])

  // Restore persisted session state on mount so refreshes do not wipe the analysis.
  // Two phases:
  //   1. Instant paint from the server-side snapshot (persisted per emailId).
  //   2. Background refresh of the MOST RECENT run from the Get workflow
  //      ({ email, company_name }) so a page refresh always restores the latest
  //      analysis — even when the snapshot is missing or stale. The last-known
  //      company domain is recovered from the AnalysisSession log in the DB.
  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      if (!emailId) {
        isHydratedRef.current = true
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
        if (cancelled || !restoreDomain) return
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
            // No snapshot — rebuild the competitor list + selections from the
            // fresh dashboard so checkboxes and header controls are restored.
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
    // Selection changed — keep the "Get Ads for Selected" section visible/active
    setIsPickingMore(true)
  }

  // Populates ALL dashboard state (KPI summary cards, ad cards grid, Market
  // Insights, Creative Analysis) from a parsed Get-workflow result and reveals
  // the dashboard tabs. Reuses the existing state setters — no new rendering.
  const populateDashboardFromGet = (fresh: AdsDashboardData) => {
    setDashboard(fresh)
    setAds(fresh.ads)
    setAdsError('')
    setInactiveCompetitorIds([])
    setIsPickingMore(false)
    setHasFetchedAds(true)
    setActiveTab('insights')
  }

  // Two-step ads analysis flow (trigger + poll):
  // STEP 1 fires the long-running Competitor Intelligence Agent Final workflow
  // (generates ad data and writes it to the DB, ~4+ minutes) WITHOUT blocking
  // the UI on its completion. A single blocking fetch to it was previously cut
  // off by gateway/ALB/browser timeouts, which threw BEFORE Step 2 ever ran —
  // the workflow keeps running server-side even when that fetch is dropped, so
  // its timeout/abort is tolerated and logged only. Its payload keys MUST be
  // exactly { companyName, Email, competitorDetails } where competitorDetails
  // is a JSON.stringify()'d array of
  // { name, competitor_domain_url, competitor_description } entries.
  // STEP 2 polls the Competitor Intelligence Agent Get workflow (DIFFERENT
  // keys { email, company_name }) every 20 seconds for up to ~15 attempts
  // (~5 minutes) until the finished analysis appears, then renders it.
  // fetchDashboardData performs the Get call server-side and already digs
  // through the nested output/result payload (extractRecords /
  // extractCreativeRows), so a valid-but-nested payload is never treated as
  // empty — it only reports success when real ads data exists.
  // isFetchingAds stays true across the ENTIRE trigger + polling window.
  const handleGetAdsForSelected = async () => {
    const selectedCompetitors = competitors.filter((c) => selectedIds.includes(c.id))
    if (!selectedCompetitors || selectedCompetitors.length === 0) return
    if (isFetchingAds) return

    const companyDomain = domain.trim() || selectedCompetitors[0]?.domain || 'unknown'
    const userEmail = emailId
    const runId = ++syncRunIdRef.current
    setIsFetchingAds(true)
    setAdsError('')
    try {
      // 1. Map to exact API schema for the Final (trigger) workflow
      const formattedCompetitors = selectedCompetitors.map((comp) => ({
        name: comp.name,
        competitor_domain_url: comp.domain,
        competitor_description: comp.description || `Competitor to ${companyDomain}`,
      }))

      const triggerPayload = {
        companyName: companyDomain,
        Email: userEmail,
        competitorDetails: JSON.stringify(formattedCompetitors),
      }

      // STEP 1: fire the trigger and tolerate its timeout — do NOT await full
      // completion; a dropped fetch must NOT abort the whole flow.
      void fetch(
        'https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls',
          },
          body: JSON.stringify(triggerPayload),
        }
      ).catch((e) => console.warn('trigger fetch dropped (workflow continues server-side):', e))

      // Session restore across refreshes is handled server-side: the persist
      // useEffect snapshots this run per emailId, and logAnalysis already
      // recorded the company domain for the Phase-2 restore refetch.

      // STEP 2: poll the Get workflow ({ email, company_name }) until data
      // appears, then populate the dashboard and stop polling.
      const maxAttempts = 15
      const intervalMs = 20000
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await fetchDashboardData(userEmail, companyDomain, selectedCompetitors)
        if (runId !== syncRunIdRef.current) return
        if (result.success && result.dashboard) {
          // Data found: populate KPI cards, ad cards grid, Insights and
          // Creative Analysis, reveal the tabs, clear the empty-state message
          // and stop polling.
          populateDashboardFromGet(result.dashboard)
          setIsFetchingAds(false)
          return
        }
        // Still empty — wait 20s and retry while the Final workflow finishes.
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
        if (runId !== syncRunIdRef.current) return
      }
      // Exhausted all attempts with genuinely no data: surface the existing
      // "No ads data was found yet" message.
      setAdsError('No ads data was found yet for this analysis. Please try again in a moment.')
    } catch (error) {
      console.error('Error running ad analysis flow:', error)
      setAdsError('Something went wrong while fetching ads. Please try again.')
    } finally {
      setIsFetchingAds(false)
    }
  }

  const handleAddCompetitor = (name: string, domainInput: string, description?: string) => {
    const cleaned = cleanDomainInput(domainInput)
    const newCompetitor: Competitor = {
      id: `comp-manual-${Date.now()}`,
      name: name.trim(),
      domain: cleaned || domainInput.trim(),
      matchScore: 70,
      description: description && description.trim() ? description.trim() : undefined,
    }
    setCompetitors((prev) => [...prev, newCompetitor])
    setSelectedIds((prev) => [...prev, newCompetitor.id])
    setIsPickingMore(true)
    setHasSearched(true)
    setIsModalOpen(false)
  }

  const handleOpenAddCompetitor = () => {
    setIsPickingMore(true)
    setIsModalOpen(true)
    domainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleFilterGallery = (format: 'all' | AdFormat, query: string) => {
    setGalleryFormat(format)
    setGallerySearch(query)
    setActiveTab('gallery')
  }

  const handleFindInGallery = (query: string) => {
    setGalleryFormat('all')
    setGallerySearch(query)
    setActiveTab('gallery')
  }

  // Derived analysis view — filters out temporarily inactive competitors
  // without mutating the underlying fetched dashboard data.
  const inactiveNames = new Set(
    (dashboard?.scorecards ?? [])
      .filter((card) => inactiveCompetitorIds.includes(card.competitorId))
      .map((card) => card.name)
  )
  const visibleAds = ads.filter((ad) => !inactiveCompetitorIds.includes(ad.competitorId))
  const visibleDashboard: AdsDashboardData | null =
    dashboard && inactiveCompetitorIds.length > 0
      ? {
          ...dashboard,
          ads: visibleAds,
          scorecards: dashboard.scorecards.filter(
            (card) => !inactiveCompetitorIds.includes(card.competitorId)
          ),
          heatmap: dashboard.heatmap.filter((row) => !inactiveNames.has(row.competitorName)),
        }
      : dashboard

  const selectedCount = selectedIds.length
  const showCompetitorPicker =
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Domain input */}
        <section ref={domainSectionRef} className="ds-card p-6">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand" />
            <h1 className="text-lg font-semibold text-grey-900">Analyze a domain</h1>
          </div>
          <p className="mt-1 text-sm text-grey-600">
            Enter a company domain to discover its competitors and analyze their ads across platforms.
          </p>
          <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. hubspot.com"
                className="ds-input"
                aria-label="Company domain"
              />
              {domainError && <p className="mt-1 text-xs text-errords">{domainError}</p>}
            </div>
            <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
              <Search className="h-4 w-4" />
              List Competitors
            </button>
          </form>
        </section>

        {isFetchingCompetitors && <Spinner label="Finding competitors for this domain…" />}

        {apiError && !isFetchingCompetitors && (
          <div className="ds-card mt-6 p-6 text-center">
            <p className="text-sm font-medium text-grey-700">{apiError}</p>
          </div>
        )}

        {showCompetitorPicker && (
          <section className="ds-card mt-6 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-grey-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <h2 className="text-base font-semibold text-grey-900">
                  Competitors found ({competitors.length})
                </h2>
              </div>
              <button
                type="button"
                className="ds-btn-secondary"
                onClick={() => setIsModalOpen(true)}
              >
                + Add Competitor Manually
              </button>
            </div>
            <CompetitorsTable
              competitors={competitors}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
            <div className="flex flex-col gap-2 border-t border-grey-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-grey-500">
                {selectedCount} of {competitors.length} competitors selected
              </p>
              <button
                type="button"
                className="ds-btn-primary"
                onClick={handleGetAdsForSelected}
                disabled={selectedCount === 0 || isFetchingAds}
              >
                Get Ads for Selected
              </button>
            </div>
          </section>
        )}

        {isFetchingAds && (
          <Spinner label="Analyzing competitor ads… this can take a few minutes. Please keep this tab open." />
        )}

        {adsError && !isFetchingAds && (
          <div className="ds-card mt-6 p-6 text-center">
            <p className="text-sm font-medium text-grey-700">{adsError}</p>
            <p className="mt-1 text-xs text-grey-500">
              The analysis may still be processing — try “Get Ads for Selected” again in a minute.
            </p>
          </div>
        )}

        {hasFetchedAds && !isFetchingAds && visibleDashboard && (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand text-white'
                      : 'border border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'insights' && <AdsDashboard data={visibleDashboard} />}
            {activeTab === 'gallery' && (
              <AdGallery
                ads={visibleAds}
                search={gallerySearch}
                format={galleryFormat}
                onSearchChange={setGallerySearch}
                onFormatChange={setGalleryFormat}
              />
            )}
            {activeTab === 'competitors' && (
              <CompetitorIntel
                data={visibleDashboard}
                ads={visibleAds}
                competitors={competitors}
                onFindInGallery={handleFindInGallery}
              />
            )}
            {activeTab === 'creative' && (
              <CreativeAnalysis ads={visibleAds} onFilterGallery={handleFilterGallery} />
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
