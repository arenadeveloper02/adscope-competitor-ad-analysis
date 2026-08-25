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
import { logAnalysis, runAdsWorkflow, searchCompetitors } from '@/lib/actions'
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

  // Executes the ads workflow for the selected competitors. The API expects the
  // exact keys name / competitor_domain_url / competitor_description, and the
  // competitorDetails field MUST be a stringified array (not a native array).
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
      // 1. Map to exact API schema
      const formattedCompetitors = selectedCompetitors.map((comp) => ({
        name: comp.name,
        competitor_domain_url: comp.domain,
        competitor_description: comp.description || `Competitor to ${companyDomain}`,
      }))

      // 2. Construct payload with double-stringified array
      const payload = {
        companyName: companyDomain,
        Email: userEmail,
        competitorDetails: JSON.stringify(formattedCompetitors),
      }

      // 3. Execute POST request
      const response = await fetch(
        'https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      await response.json()

      // 4. Proceed to fetch Dashboard Data from DB here
      const result = await runAdsWorkflow(companyDomain, emailId, selectedCompetitors)
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
      console.error('Error triggering ad workflow:', error)
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
    const inactiveNames = new Set(
      competitors.filter((c) => inactiveSet.has(c.id)).map((c) => c.name)
    )
    const scorecards = dashboard.scorecards.filter((s) => !inactiveSet.has(s.competitorId))
    const heatmap = dashboard.heatmap.filter((row) => !inactiveNames.has(row.competitorName))
    const remainingAds = dashboard.ads.filter((ad) => !inactiveSet.has(ad.competitorId))
    const total = remainingAds.length
    const activeCount = remainingAds.filter((ad) => ad.active !== false).length
    const imageCreatives = remainingAds.filter((ad) => deriveAdFormat(ad) === 'image').length
    const videoCreatives = remainingAds.filter((ad) => deriveAdFormat(ad) === 'video').length
    visibleDashboard = {
      ...dashboard,
      kpis: {
        totalAds: total,
        activePct: total > 0 ? Math.round((activeCount / total) * 100) : 0,
        imageCreatives,
        videoCreatives,
        competitorCount: scorecards.length,
      },
      scorecards,
      heatmap,
      ads: remainingAds,
    }
  }

  const selectedCount = selectedIds.length

  return (
    <div className="min-h-screen">
      <TopNav
        companyName={domain.trim()}
        competitors={competitors}
        activeCompetitorIds={selectedIds}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCompetitor={() => setIsModalOpen(true)}
        onToggleCompetitor={handleToggleCompetitorActive}
        showTabs={dashboardVisible}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Analyze a Domain — hidden once the dashboard is visible */}
        {showSetup && (
          <section ref={domainSectionRef} className="ds-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ds bg-brand-surface text-brand">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-grey-900">Analyze a Domain</h1>
                <p className="text-sm text-grey-600">
                  Enter a company domain to discover its competitors and analyze their ads.
                </p>
              </div>
            </div>
            <form onSubmit={handleListCompetitors} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value)
                    if (domainError) setDomainError('')
                  }}
                  placeholder="e.g. hubspot.com"
                  className="ds-input"
                  aria-label="Domain URL to analyze"
                />
                {domainError && <p className="mt-1 text-xs text-errords">{domainError}</p>}
              </div>
              <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
                <Search className="h-5 w-5" />
                {isFetchingCompetitors ? 'Searching…' : 'List Competitors'}
              </button>
            </form>
          </section>
        )}

        {/* Competitor discovery loading state */}
        {isFetchingCompetitors && (
          <div className="ds-card mt-6 p-10">
            <Spinner label="Discovering competitors for this domain…" />
          </div>
        )}

        {/* Competitor discovery error */}
        {!isFetchingCompetitors && apiError && (
          <div className="ds-card mt-6 border-l-4 p-4" style={{ borderLeftColor: '#F31A1A' }}>
            <p className="text-sm text-grey-700">{apiError}</p>
          </div>
        )}

        {/* Competitor selection table + Get Ads for Selected. Re-surfaces whenever
            the user changes their competitor selection (table checkboxes, header
            dropdown toggles, or Add Competitor). */}
        {!isFetchingCompetitors && showTable && competitors.length > 0 && (
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
                className="ds-btn-primary"
                onClick={handleGetAdsForSelected}
                disabled={isFetchingAds || selectedCount === 0}
                aria-label="Get ads for selected competitors"
              >
                {isFetchingAds
                  ? 'Fetching Ads…'
                  : `Get Ads for Selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
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

        {/* Ads workflow loading state */}
        {isFetchingAds && (
          <div className="ds-card mt-6 p-10">
            <Spinner label="Fetching and analyzing competitor ads — this can take a moment…" />
          </div>
        )}

        {/* Ads workflow error */}
        {!isFetchingAds && adsError && (
          <div className="ds-card mt-6 border-l-4 p-4" style={{ borderLeftColor: '#F31A1A' }}>
            <p className="text-sm text-grey-700">{adsError}</p>
          </div>
        )}

        {/* Dashboard tabs — visible only after a successful ads fetch */}
        {!isFetchingAds && dashboardVisible && visibleDashboard && (
          <>
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
              <CompetitorIntel data={visibleDashboard} onFindInGallery={handleFindInGallery} />
            )}
            {activeTab === 'creative' && (
              <CreativeAnalysis data={visibleDashboard} onFilterGallery={handleFilterGallery} />
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
