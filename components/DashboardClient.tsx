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
import { deriveAdFormat } from '@/components/AdCard'

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

  // Restore persisted session state on mount so refreshes do not wipe the analysis
  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      if (!emailId) {
        isHydratedRef.current = true
        return
      }
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
        }
      } catch {
        // ignore restore failures — start with a clean slate
      }
      if (!cancelled) isHydratedRef.current = true
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

  // Tabs and dashboard sections are visible only after a successful ads fetch
  const dashboardVisible = hasFetchedAds && dashboard !== null
  // The initial "Analyze a Domain" block is hidden once the dashboard is visible
  const showSetup = !dashboardVisible
  // The competitor table shows before the dashboard loads, or when the user is
  // adding/selecting extra competitors after the dashboard has loaded
  const showTable = hasSearched && (!dashboardVisible || isPickingMore)

  // Derived dashboard view that excludes temporarily inactive competitors
  // without mutating the fetched dashboard, so restoring them is instant.
  let visibleDashboard: AdsDashboardData | null = dashboard
  if (dashboard && inactiveCompetitorIds.length > 0) {
    const inactiveSet = new Set(inactiveCompetitorIds)
    const filteredScorecards = dashboard.scorecards.filter((s) => !inactiveSet.has(s.competitorId))
    const filteredAds = dashboard.ads.filter((ad) => !inactiveSet.has(ad.competitorId))
    const activeNames = new Set(filteredScorecards.map((s) => s.name))
    const filteredHeatmap = dashboard.heatmap.filter((row) => activeNames.has(row.competitorName))
    const totalAds = filteredAds.length
    const activeCount = filteredAds.filter((ad) => ad.active ?? true).length
    visibleDashboard = {
      ...dashboard,
      scorecards: filteredScorecards,
      heatmap: filteredHeatmap,
      ads: filteredAds,
      kpis: {
        ...dashboard.kpis,
        totalAds,
        activePct: totalAds > 0 ? Math.round((activeCount / totalAds) * 100) : 0,
        imageCreatives: filteredAds.filter((ad) => deriveAdFormat(ad) === 'image').length,
        videoCreatives: filteredAds.filter((ad) => deriveAdFormat(ad) === 'video').length,
        competitorCount: filteredScorecards.length,
      },
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav
        competitors={competitors}
        selectedIds={selectedIds}
        showCompetitorMenu={dashboardVisible}
        onToggleCompetitor={handleToggleCompetitorActive}
        onAddCompetitor={() => setIsModalOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showSetup && (
          <section className="ds-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface">
                <Megaphone className="h-5 w-5 text-brand" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-grey-900">Analyze a Domain</h1>
                <p className="text-sm text-grey-600">
                  Enter any company domain to discover its competitors and analyze their ads.
                </p>
              </div>
            </div>
            <form onSubmit={handleListCompetitors} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. hubspot.com"
                  className="ds-input"
                  style={{ paddingLeft: '44px' }}
                  aria-label="Company domain"
                />
              </div>
              <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
                {isFetchingCompetitors ? 'Finding Competitors…' : 'List Competitors'}
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
        )}

        {isFetchingCompetitors && (
          <div className="ds-card mt-6 flex items-center gap-3 p-6">
            <Spinner />
            <p className="text-sm text-grey-700">Searching for competitors…</p>
          </div>
        )}

        {showTable && competitors.length > 0 && (
          <section ref={domainSectionRef} className="ds-card mt-6">
            <div className="flex flex-col gap-3 border-b border-grey-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <h2 className="text-base font-semibold text-grey-900">
                  Competitors ({competitors.length})
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ds-btn-secondary" onClick={() => setIsModalOpen(true)}>
                  + Add Competitor
                </button>
                <button
                  type="button"
                  className="ds-btn-primary"
                  onClick={handleGetAdsForSelected}
                  disabled={isFetchingAds || selectedIds.length === 0}
                >
                  {isFetchingAds ? 'Fetching Ads…' : `Get Ads for Selected (${selectedIds.length})`}
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

        {hasSearched && !isFetchingCompetitors && competitors.length === 0 && !apiError && (
          <div className="ds-card mt-6 p-10 text-center">
            <p className="text-sm font-medium text-grey-700">No competitors found</p>
            <p className="mt-1 text-xs text-grey-500">Try a different domain or add a competitor manually.</p>
          </div>
        )}

        {isFetchingAds && (
          <div className="ds-card mt-6 flex items-center gap-3 p-6">
            <Spinner />
            <div>
              <p className="text-sm font-medium text-grey-900">Running the ads analysis…</p>
              <p className="text-xs text-grey-500">
                This can take a few minutes while we collect and process competitor creatives. Please keep this tab open.
              </p>
            </div>
          </div>
        )}

        {adsError && !isFetchingAds && (
          <div className="ds-card mt-6 p-6">
            <p className="text-sm font-medium" style={{ color: '#F31A1A' }}>
              {adsError}
            </p>
          </div>
        )}

        {dashboardVisible && visibleDashboard && (
          <>
            <nav className="mt-8 flex flex-wrap gap-2 border-b border-grey-200">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'text-brand' : 'text-grey-600 hover:text-grey-900'
                  }`}
                  style={{ borderBottomColor: activeTab === tab.id ? '#1A73E8' : 'transparent' }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'insights' && <AdsDashboard data={visibleDashboard} />}
            {activeTab === 'gallery' && (
              <AdGallery
                ads={visibleDashboard.ads}
                search={gallerySearch}
                format={galleryFormat}
                onSearchChange={setGallerySearch}
                onFormatChange={setGalleryFormat}
              />
            )}
            {activeTab === 'competitors' && (
              <CompetitorIntel
                data={visibleDashboard}
                competitors={competitors}
                onFindInGallery={handleFindInGallery}
              />
            )}
            {activeTab === 'creative' && (
              <CreativeAnalysis ads={visibleDashboard.ads} onFilterGallery={handleFilterGallery} />
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
