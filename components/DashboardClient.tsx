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

  // Executes the ads workflow for the selected competitors. The API expects the
  // exact keys name / competitor_domain_url / competitor_description, and the
  // competitorDetails field is sent as a NATIVE JSON array (matching the
  // documented request body), together with the lowercase `email` key.
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
      // 1. Map to exact API schema — entries of the competitorDetails array
      const formattedCompetitors = selectedCompetitors.map((comp) => ({
        name: comp.name,
        competitor_domain_url: comp.domain,
        competitor_description: comp.description || `Competitor to ${companyDomain}`,
      }))

      // 2. Construct payload — competitorDetails is a native array (NOT stringified)
      const payload = {
        companyName: companyDomain,
        email: userEmail,
        competitorDetails: formattedCompetitors,
      }

      // 3. Execute POST request to trigger the ads workflow
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

      // 4. Fetch the dashboard details from the DB-backed workflow for this email
      const result = await fetchDashboardData(emailId, selectedCompetitors)
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
    const activeCount = remainingAds.filter((ad) => ad.active ?? true).length
    const imageCount = remainingAds.filter((ad) => deriveAdFormat(ad) === 'image').length
    const videoCount = remainingAds.filter((ad) => deriveAdFormat(ad) === 'video').length
    visibleDashboard = {
      ...dashboard,
      scorecards,
      heatmap,
      ads: remainingAds,
      kpis: {
        totalAds: total,
        activePct: total > 0 ? Math.round((activeCount / total) * 100) : 0,
        imageCreatives: imageCount,
        videoCreatives: videoCount,
        competitorCount: scorecards.length,
      },
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav
        domain={domain}
        competitors={competitors}
        selectedIds={selectedIds}
        showCompetitors={dashboardVisible}
        onToggleCompetitor={handleToggleCompetitorActive}
        onAddCompetitor={() => setIsModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Analyze a Domain — hidden once the dashboard is visible */}
        {showSetup && (
          <section ref={domainSectionRef} className="ds-card p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand" />
              <h1 className="text-xl font-semibold text-grey-900">Analyze a Domain</h1>
            </div>
            <p className="mt-1 text-sm text-grey-600">
              Enter a company domain to discover its competitors and analyze their ads across platforms.
            </p>
            <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. example.com"
                  className="ds-input"
                  style={{ paddingLeft: '44px' }}
                  aria-label="Domain to analyze"
                />
              </div>
              <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
                {isFetchingCompetitors ? 'Searching…' : 'List Competitors'}
              </button>
            </form>
            {domainError && <p className="mt-2 text-sm text-errords-deep">{domainError}</p>}
            {apiError && <p className="mt-2 text-sm text-errords-deep">{apiError}</p>}
            {isFetchingCompetitors && (
              <div className="mt-6">
                <Spinner label="Finding competitors for this domain…" />
              </div>
            )}
          </section>
        )}

        {/* Competitor selection table + Get Ads for Selected */}
        {showTable && !isFetchingCompetitors && competitors.length > 0 && (
          <section className="ds-card mt-6 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-grey-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <div>
                  <h2 className="text-base font-semibold text-grey-900">Select Competitors</h2>
                  <p className="text-xs text-grey-500">
                    {selectedIds.length} of {competitors.length} selected
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="ds-btn-secondary" onClick={() => setIsModalOpen(true)}>
                  + Add Competitor
                </button>
                <button
                  type="button"
                  className="ds-btn-primary"
                  onClick={handleGetAdsForSelected}
                  disabled={selectedIds.length === 0 || isFetchingAds}
                >
                  {isFetchingAds ? 'Fetching Ads…' : 'Get Ads for Selected'}
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
          <div className="ds-card mt-6 p-10">
            <Spinner label="Fetching ads and building your dashboard…" />
          </div>
        )}

        {adsError && !isFetchingAds && (
          <div className="ds-card mt-6 p-5">
            <p className="text-sm text-errords-deep">{adsError}</p>
          </div>
        )}

        {/* Dashboard tabs — visible only after a successful ads fetch */}
        {dashboardVisible && visibleDashboard && !isFetchingAds && (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCompetitor}
      />
    </div>
  )
}
