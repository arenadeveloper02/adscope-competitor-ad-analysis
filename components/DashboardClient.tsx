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

  // Two-step ads analysis flow:
  // STEP 1 triggers the long-running Competitor Intelligence Agent Final
  // workflow (generates ad data and writes it to the DB, ~4+ minutes). Its
  // payload keys MUST be exactly { companyName, Email, competitorDetails }
  // where competitorDetails is a JSON.stringify()'d array of
  // { name, competitor_domain_url, competitor_description } entries.
  // STEP 2 (only after Step 1 succeeds) fetches the finished analysis from the
  // Competitor Intelligence Agent Get workflow, which expects the DIFFERENT
  // keys { email, company_name }. isFetchingAds stays true across BOTH calls.
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

      // STEP 1: Trigger the long-running Final workflow and WAIT for it to finish
      const triggerResponse = await fetch(
        'https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls',
          },
          body: JSON.stringify(triggerPayload),
        }
      )

      if (!triggerResponse.ok) throw new Error(`Trigger API Error: ${triggerResponse.status}`)
      const triggerData: unknown = await triggerResponse.json()
      const triggerSucceeded =
        typeof triggerData === 'object' &&
        triggerData !== null &&
        (triggerData as { success?: unknown }).success === true
      if (!triggerSucceeded) throw new Error('Trigger workflow did not complete successfully')

      // STEP 2: Fetch the dashboard result from the Get workflow — DIFFERENT
      // payload keys ({ email, company_name }); parsed server-side into the
      // AdsDashboardData shape that powers all dashboard sections.
      const result = await fetchDashboardData(userEmail, companyDomain, selectedCompetitors)
      if (runId !== syncRunIdRef.current) return
      if (result.success && result.dashboard) {
        setDashboard(result.dashboard)
        setAds(result.dashboard.ads)
        // Fresh dashboard covers the newly selected set — every competitor active again
        setInactiveCompetitorIds([])
        // Dashboard is now visible — collapse the competitor picker again
        setIsPickingMore(false)
      } else {
        setDashboard(null)
        setAds([])
        setAdsError(result.error ?? 'Something went wrong while fetching ads. Please try again.')
      }
      setHasFetchedAds(true)
    } catch (error) {
      console.error('Error running ad analysis flow:', error)
      if (runId !== syncRunIdRef.current) return
      setDashboard(null)
      setAds([])
      setAdsError('Something went wrong while fetching ads. Please try again.')
      setHasFetchedAds(true)
    } finally {
      if (runId === syncRunIdRef.current) setIsFetchingAds(false)
    }
  }

  // "Add" only appends the competitor locally — the ads workflow runs only when
  // the user clicks the main "Get Ads for Selected" button. Adding a competitor
  // re-displays the competitor selection table so the user can select and re-run.
  const handleAddCompetitor = (newDomain: string) => {
    const cleaned = cleanDomainInput(newDomain)
    if (!cleaned) return
    const label = cleaned.split('.')[0] ?? cleaned
    const name = label ? label.charAt(0).toUpperCase() + label.slice(1) : cleaned
    const competitor: Competitor = {
      id: `comp-${Date.now()}-manual`,
      name,
      domain: cleaned,
      matchScore: 60 + ((cleaned.length * 7) % 36),
    }
    setCompetitors((prev) => [...prev, competitor])
    setSelectedIds((prev) => [...prev, competitor.id])
    setApiError('')
    setHasSearched(true)
    setIsPickingMore(true)
    setIsModalOpen(false)
  }

  // Checkbox toggle from the top header competitor dropdown: checking/unchecking
  // updates the selected competitors state and immediately re-displays the
  // competitor table with the "Get Ads for Selected" button so the user can
  // re-trigger the ads workflow with the newly modified selection.
  const handleToggleCompetitorActive = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setIsPickingMore(true)
  }

  const handleFindInGallery = (query: string) => {
    setGallerySearch(query)
    setGalleryFormat('all')
    setActiveTab('gallery')
  }

  const handleFilterGallery = (format: 'all' | AdFormat, query: string) => {
    setGalleryFormat(format)
    setGallerySearch(query)
    setActiveTab('gallery')
  }

  // Tabs and dashboard sections are visible only after ads have been fetched.
  // Derived view: filter out temporarily inactive competitors without mutating
  // the underlying fetched dashboard data.
  const visibleAds: CompetitorAd[] = ads.filter(
    (ad) => !inactiveCompetitorIds.includes(ad.competitorId)
  )
  let activeDashboard: AdsDashboardData | null = dashboard
  if (dashboard && inactiveCompetitorIds.length > 0) {
    const inactiveNames = new Set(
      dashboard.scorecards
        .filter((card) => inactiveCompetitorIds.includes(card.competitorId))
        .map((card) => card.name)
    )
    activeDashboard = {
      ...dashboard,
      scorecards: dashboard.scorecards.filter(
        (card) => !inactiveCompetitorIds.includes(card.competitorId)
      ),
      heatmap: dashboard.heatmap.filter((row) => !inactiveNames.has(row.competitorName)),
      ads: visibleAds,
    }
  }

  const showPicker =
    hasSearched &&
    competitors.length > 0 &&
    !isFetchingCompetitors &&
    (!hasFetchedAds || isPickingMore)

  return (
    <div className="min-h-screen">
      <TopNav
        competitors={competitors}
        selectedIds={selectedIds}
        showCompetitorControls={hasFetchedAds && competitors.length > 0}
        onToggleCompetitor={handleToggleCompetitorActive}
        onAddCompetitor={() => setIsModalOpen(true)}
      />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {/* Domain analysis form */}
        <section ref={domainSectionRef} className="ds-card p-6">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-grey-600" />
            <h1 className="text-lg font-semibold text-grey-900">Analyze a Domain</h1>
          </div>
          <p className="mt-1 text-sm text-grey-600">
            Enter a company domain to discover its closest competitors, then fetch and analyze their ads.
          </p>
          <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Enter a domain to analyze, e.g. hubspot.com"
                className="ds-input"
                style={{ paddingLeft: '44px' }}
                aria-label="Company domain"
              />
            </div>
            <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
              {isFetchingCompetitors ? 'Searching…' : 'List Competitors'}
            </button>
          </form>
          {domainError && (
            <p className="mt-2 text-sm" style={{ color: '#F31A1A' }}>
              {domainError}
            </p>
          )}
          {apiError && (
            <p className="mt-2 text-sm" style={{ color: '#F31A1A' }}>
              {apiError}
            </p>
          )}
        </section>

        {isFetchingCompetitors && <Spinner label="Finding competitors…" />}

        {/* Competitor selection table + Get Ads for Selected */}
        {showPicker && (
          <section className="ds-card mt-6 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-grey-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <h2 className="text-base font-semibold text-grey-900">Competitors</h2>
                <span className="inline-flex items-center rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand">
                  {selectedIds.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ds-btn-secondary"
                  onClick={() => setIsModalOpen(true)}
                >
                  + Add Competitor
                </button>
                <button
                  type="button"
                  className="ds-btn-primary"
                  onClick={handleGetAdsForSelected}
                  disabled={selectedIds.length === 0 || isFetchingAds}
                >
                  {isFetchingAds ? 'Analyzing…' : 'Get Ads for Selected'}
                </button>
              </div>
            </div>
            <CompetitorsTable
              competitors={competitors}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          </section>
        )}

        {isFetchingAds && (
          <Spinner label="Running the ads analysis — this can take a few minutes. Please keep this tab open…" />
        )}

        {adsError && !isFetchingAds && (
          <div className="ds-card mt-6 p-6 text-center">
            <p className="text-sm font-medium" style={{ color: '#F31A1A' }}>
              {adsError}
            </p>
          </div>
        )}

        {/* Dashboard tabs — visible only once ads have been fetched */}
        {activeDashboard && !isFetchingAds && (
          <>
            <div className="mt-8 flex flex-wrap gap-2 border-b border-grey-200 pb-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand text-white'
                      : 'border border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'insights' && <AdsDashboard data={activeDashboard} />}
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
                data={activeDashboard}
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
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCompetitor}
      />
    </div>
  )
}
