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
  // (triggered by the top header "+ Add Competitor" flow)
  const [isPickingMore, setIsPickingMore] = useState(false)

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
      setHasFetchedAds(false)
      setHasSearched(true)
    } catch {
      setCompetitors([])
      setApiError('Something went wrong while fetching competitors. Please try again.')
      setSelectedIds([])
      setAds([])
      setDashboard(null)
      setAdsError('')
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

  return (
    <div className="min-h-screen">
      <TopNav
        companyName={cleanDomainInput(domain)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCompetitor={() => setIsModalOpen(true)}
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
              Enter a company domain to discover its top competitors.
            </p>
            <form onSubmit={handleListCompetitors} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. hubspot.com"
                className="ds-input flex-1"
                aria-label="Domain to analyze"
                disabled={isFetchingCompetitors}
              />
              <button type="submit" className="ds-btn-primary" disabled={isFetchingCompetitors}>
                {isFetchingCompetitors ? (
                  <>
                    <Spinner />
                    Finding Competitors...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    List Competitors
                  </>
                )}
              </button>
            </form>
            {domainError && <p className="mt-2 text-xs text-errords">{domainError}</p>}
            {apiError && <p className="mt-2 text-xs text-errords">{apiError}</p>}
          </section>
        )}

        {/* Competitor selection table — hidden once the dashboard loads, re-shown via Add Competitor */}
        {showTable && competitors.length > 0 && (
          <section className="ds-card mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-100 p-5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-grey-600" />
                <h2 className="text-lg font-semibold text-grey-900">Competitors</h2>
                <span className="text-xs text-grey-500">
                  {selectedIds.length} of {competitors.length} selected
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
                    Get Ads for Selected
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

        {adsError && (
          <div className="ds-card mt-4 p-4">
            <p className="text-sm text-errords">{adsError}</p>
          </div>
        )}

        {/* Dashboard sections — only rendered after a successful ads fetch */}
        {dashboardVisible && dashboard && (
          <>
            {activeTab === 'insights' && <AdsDashboard data={dashboard} />}
            {activeTab === 'gallery' && (
              <AdGallery
                ads={ads}
                data={dashboard}
                search={gallerySearch}
                onSearchChange={setGallerySearch}
                format={galleryFormat}
                onFormatChange={setGalleryFormat}
              />
            )}
            {activeTab === 'competitors' && (
              <CompetitorIntel
                data={dashboard}
                ads={ads}
                competitors={competitors}
                onFindInGallery={handleFindInGallery}
              />
            )}
            {activeTab === 'creative' && (
              <CreativeAnalysis data={dashboard} ads={ads} onFilterGallery={handleFilterGallery} />
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
