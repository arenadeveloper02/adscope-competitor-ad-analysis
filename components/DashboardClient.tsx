"use client"

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Megaphone, Plus, RotateCcw, Search, Users } from 'lucide-react'
import type {
  AdFormat,
  AdsDashboardData,
  Competitor,
  CompetitorAd,
  DashboardTab,
  SnapshotPayload,
} from '@/lib/types'
import { logAnalysis, runAdsWorkflow, searchCompetitors } from '@/lib/actions'
import { exportDashboardToSheet } from '@/lib/sheet-actions'
import {
  clearDashboardSnapshot,
  loadDashboardSnapshot,
  saveDashboardSnapshot,
} from '@/lib/snapshot-actions'
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
  const [isExporting, setIsExporting] = useState(false)
  const [sheetMessage, setSheetMessage] = useState('')

  const isHydratedRef = useRef(false)
  const domainRef = useRef('')
  const syncRunIdRef = useRef(0)
  const exportRunIdRef = useRef(0)
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

  const scrollToDomainInput = () => {
    const section = domainSectionRef.current
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

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

  // Cancels an in-progress sync: the pending request result is ignored
  const handleCancelSync = () => {
    if (!isFetchingAds) return
    syncRunIdRef.current += 1
    setIsFetchingAds(false)
    setSheetMessage('Sync cancelled. The in-flight request result will be ignored.')
  }

  // Cancels an in-progress sheet export
  const handleCancelExport = () => {
    if (!isExporting) return
    exportRunIdRef.current += 1
    setIsExporting(false)
    setSheetMessage('Sheet export cancelled.')
  }

  // "Add" only appends the competitor locally — the ads workflow runs only when
  // the user clicks the main "Get Ads for Selected" button.
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
    setIsModalOpen(false)
  }

  const handleSync = () => {
    if (selectedIds.length === 0 || isFetchingAds) {
      setSheetMessage('Select competitors and fetch ads to sync the dataset.')
      return
    }
    setSheetMessage('Syncing latest ads for the selected competitors...')
    void handleGetAds()
  }

  const handleSheetExport = async () => {
    if (isExporting) return
    if (!dashboard) {
      setSheetMessage('Run an ads analysis first to export data.')
      return
    }
    const runId = ++exportRunIdRef.current
    setIsExporting(true)
    setSheetMessage('Exporting dashboard to sheet storage...')
    try {
      const companyName = domain.trim() || 'unknown'
      const result = await exportDashboardToSheet(companyName, emailId, dashboard)
      if (runId !== exportRunIdRef.current) return
      setSheetMessage(
        result.success
          ? 'Dashboard synced to sheet storage.'
          : result.error ?? 'Export failed. Please try again.'
      )
    } catch {
      if (runId !== exportRunIdRef.current) return
      setSheetMessage('Export failed. Please try again.')
    } finally {
      if (runId === exportRunIdRef.current) setIsExporting(false)
    }
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

  // Resets all state so the user can analyze a new domain from scratch
  const handleClear = () => {
    syncRunIdRef.current += 1
    exportRunIdRef.current += 1
    setDomain('')
    setDomainError('')
    setApiError('')
    setAdsError('')
    setCompetitors([])
    setSelectedIds([])
    setAds([])
    setDashboard(null)
    setIsFetchingCompetitors(false)
    setIsFetchingAds(false)
    setHasSearched(false)
    setHasFetchedAds(false)
    setActiveTab('insights')
    setGallerySearch('')
    setGalleryFormat('all')
    setIsExporting(false)
    setSheetMessage('')
    if (emailId) void clearDashboardSnapshot(emailId)
    scrollToDomainInput()
  }

  return (
    <div className="min-h-screen">
      <TopNav
        companyName={cleanDomainInput(domain)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSync={handleSync}
        onCancelSync={handleCancelSync}
        onSheet={handleSheetExport}
        onCancelSheet={handleCancelExport}
        isSyncing={isFetchingAds}
        isExporting={isExporting}
        sheetMessage={sheetMessage}
      />

      <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {/* Top bar with primary CTA */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-10 text-grey-900">AdScope</h1>
            <p className="mt-1 text-sm text-grey-600">
              Discover competitors for any domain and analyze their ads across platforms.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {hasSearched && (
              <button type="button" className="ds-btn-secondary" onClick={handleClear}>
                <RotateCcw className="h-4 w-4" />
                Search Other Company
              </button>
            )}
            <button type="button" className="ds-btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-5 w-5" />
              Add Competitor
            </button>
          </div>
        </header>

        {/* Domain input section */}
        <section ref={domainSectionRef} className="ds-card mt-8 p-6">
          <h2 className="text-lg font-semibold text-grey-900">Analyze a Domain</h2>
          <form
            onSubmit={handleListCompetitors}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="domain-url" className="block text-xs font-medium tracking-wide text-grey-700">
                Enter Domain URL
              </label>
              <input
                id="domain-url"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. yourbrand.com"
                className="ds-input mt-2"
                disabled={isFetchingCompetitors}
              />
            </div>
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
        </section>

        {/* Competitors selection table */}
        <section className="ds-card mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-grey-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-grey-600" />
              <h2 className="text-lg font-semibold text-grey-900">Competitors</h2>
            </div>
            {competitors.length > 0 && (
              <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand">
                {selectedIds.length} of {competitors.length} selected
              </span>
            )}
          </div>

          {isFetchingCompetitors ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-grey-600">
              <Spinner size="md" className="text-brand" />
              <p className="text-sm">Scanning the market for competitors...</p>
            </div>
          ) : competitors.length === 0 ? (
            <div className="px-6 py-16 text-center">
              {apiError ? (
                <>
                  <p className="text-sm font-medium text-errords">Could not fetch competitors</p>
                  <p className="mt-1 text-xs text-grey-500">{apiError}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-grey-700">
                    {hasSearched ? 'No competitors found' : 'No competitors yet'}
                  </p>
                  <p className="mt-1 text-xs text-grey-500">
                    {hasSearched
                      ? 'Try a different domain or add a competitor manually.'
                      : 'Enter a domain above and click "List Competitors" to get started.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <CompetitorsTable
                competitors={competitors}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
              />
              <div className="flex flex-col gap-2 border-t border-grey-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-grey-500">
                  Select competitors and fetch their live ads to populate the dashboard tabs.
                </p>
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
            </>
          )}
        </section>

        {/* Ads loading state with cancel control */}
        {isFetchingAds && (
          <div className="ds-card mt-6 flex flex-col items-center justify-center gap-3 px-6 py-16 text-grey-600">
            <Spinner size="md" className="text-brand" />
            <p className="text-sm">Analyzing ads across platforms...</p>
            <button type="button" className="ds-btn-secondary" onClick={handleCancelSync}>
              Cancel Sync
            </button>
          </div>
        )}

        {/* Ads error state */}
        {adsError && !isFetchingAds && hasFetchedAds && (
          <div className="ds-card mt-6 p-6 text-center">
            <p className="text-sm font-medium text-errords">Could not fetch ads</p>
            <p className="mt-1 text-xs text-grey-500">{adsError}</p>
          </div>
        )}

        {/* Dashboard tabs */}
        {dashboard && !isFetchingAds && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="ds-btn-secondary" onClick={scrollToDomainInput}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button type="button" className="ds-btn-secondary" onClick={handleClear}>
                <RotateCcw className="h-4 w-4" />
                Clear & Search New Company
              </button>
            </div>
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
              <CreativeAnalysis
                data={dashboard}
                ads={ads}
                onFilterGallery={handleFilterGallery}
                onBack={scrollToDomainInput}
              />
            )}
          </>
        )}

        <AddCompetitorModal
          isOpen={isModalOpen}
          isSubmitting={false}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddCompetitor}
        />
      </div>
    </div>
  )
}
