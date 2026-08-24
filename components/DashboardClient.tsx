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
  }

  const handleToggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === competitors.length ? [] : competitors.map((c) => c.id)
    )
  }

  const handleGetAds = async () => {
    if (isFetchingAds || selectedIds.length === 0) return
    const selected = competitors.filter((c) => selectedIds.includes(c.id))
    const runId = ++syncRunIdRef.current
    setIsFetchingAds(true)
    setAdsError('')
    try {
      const companyName = domain.trim() || selected[0]?.domain || 'unknown'
      const result = await runAdsWorkflow(companyName, emailId, selected)
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
    } catch {
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
    const activeCount = remainingAds.filter((ad) => ad.active ?? true).length
    const imageCreatives = remainingAds.filter((ad) => deriveAdFormat(ad) === 'image').length
    const videoCreatives = remainingAds.filter((ad) => deriveAdFormat(ad) === 'video').length
    visibleDashboard = {
      ...dashboard,
      scorecards,
      heatmap,
      ads: remainingAds,
      kpis: {
        ...dashboard.kpis,
        totalAds: total,
        activePct: total > 0 ? Math.round((activeCount / total) * 100) : 0,
        imageCreatives,
        videoCreatives,
        competitorCount: scorecards.length,
      },
    }
  }
  const visibleAds = ads.filter((ad) => !inactiveCompetitorIds.includes(ad.competitorId))

  return (
    <div className="min-h-screen">
      <TopNav
        companyName={cleanDomainInput(domain)}
        competitors={competitors}
        activeCompetitorIds={selectedIds}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCompetitor={() => setIsModalOpen(true)}
        onToggleCompetitor={handleToggleCompetitorActive}
        showTabs={dashboardVisible}
      />

      <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {showSetup && (
          <header>
            <h1 className="text-3xl font-semibold leading-10 text-grey-900">AdScope</h1>
            <p className="mt-1 text-sm text-grey-600">
              Discover competitors for any domain and analyze their ads across platforms.
            </p>
          </header>
        )}

        {/* Domain input section — hidden once the dashboard is visible */}
        {showSetup && (
          <section ref={domainSectionRef} className="ds-card mt-8 p-6">
            <h2 className="text-lg font-semibold text-grey-900">Analyze a Domain</h2>
            <p className="mt-1 text-sm text-grey-600">
              Enter your company domain to discover which competitors are advertising against you.
            </p>
            <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. yourcompany.com"
                className="ds-input"
                disabled={isFetchingCompetitors}
                aria-label="Company domain"
              />
              <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
                {isFetchingCompetitors ? (
                  <>
                    <Spinner />
                    Finding Competitors...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    List Competitors
                  </>
                )}
              </button>
            </form>
            {domainError && <p className="mt-2 text-xs text-errords">{domainError}</p>}
            {apiError && <p className="mt-2 text-xs text-errords">{apiError}</p>}
          </section>
        )}

        {/* Competitor selection table — shown before the dashboard loads, or when
            adding/re-selecting competitors after the dashboard has loaded */}
        {showTable && competitors.length > 0 && (
          <section className="ds-card mt-8 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <h2 className="text-lg font-semibold text-grey-900">Competitors</h2>
                <span className="inline-flex items-center rounded-full bg-brand-surface px-2 py-0.5 text-xs font-semibold text-brand">
                  {competitors.length}
                </span>
              </div>
              <button
                type="button"
                className="ds-btn-primary"
                onClick={handleGetAds}
                disabled={isFetchingAds || selectedIds.length === 0}
              >
                {isFetchingAds ? (
                  <>
                    <Spinner />
                    Fetching Ads...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-5 w-5" />
                    Get Ads for Selected ({selectedIds.length})
                  </>
                )}
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

        {/* Ads workflow error */}
        {adsError && !isFetchingAds && (
          <div className="ds-card mt-6 p-4">
            <p className="text-sm text-errords">{adsError}</p>
          </div>
        )}

        {/* Loading state while the ads workflow runs */}
        {isFetchingAds && (
          <div className="ds-card mt-8 flex flex-col items-center justify-center p-12 text-center">
            <Spinner />
            <p className="mt-3 text-sm font-medium text-grey-700">
              Fetching ads for the selected competitors...
            </p>
            <p className="mt-1 text-xs text-grey-500">This can take a moment while we scan ad platforms.</p>
          </div>
        )}

        {/* Dashboard tabs — visible only after a successful ads fetch */}
        {dashboardVisible && visibleDashboard && (
          <>
            {activeTab === 'insights' && <AdsDashboard data={visibleDashboard} />}
            {activeTab === 'gallery' && (
              <AdGallery
                ads={visibleAds}
                data={visibleDashboard}
                search={gallerySearch}
                onSearchChange={setGallerySearch}
                format={galleryFormat}
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
              <CreativeAnalysis
                data={visibleDashboard}
                ads={visibleAds}
                onFilterGallery={handleFilterGallery}
              />
            )}
          </>
        )}
      </div>

      <AddCompetitorModal
        isOpen={isModalOpen}
        isSubmitting={false}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddCompetitor}
      />
    </div>
  )
}
