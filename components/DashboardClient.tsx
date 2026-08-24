"use client"

import { useState } from 'react'
import { Plus, Search, Megaphone, Users } from 'lucide-react'
import type { AdsDashboardData, Competitor, CompetitorAd } from '@/lib/types'
import { logAnalysis, runAdsWorkflow, searchCompetitors } from '@/lib/actions'
import { useArenaEmailId } from '@/components/arena-email-provider'
import AddCompetitorModal from '@/components/AddCompetitorModal'
import AdsDashboard from '@/components/AdsDashboard'
import CompetitorsTable from '@/components/CompetitorsTable'
import AdCard from '@/components/AdCard'
import Spinner from '@/components/Spinner'

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
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasFetchedAds, setHasFetchedAds] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    setIsFetchingAds(true)
    setAdsError('')
    try {
      const companyName = domain.trim() || selected[0]?.domain || 'unknown'
      const result = await runAdsWorkflow(companyName, emailId, selected)
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
      setDashboard(null)
      setAds([])
      setAdsError('Something went wrong while fetching ads. Please try again.')
      setHasFetchedAds(true)
    } finally {
      setIsFetchingAds(false)
    }
  }

  const handleAddCompetitor = async (newDomain: string) => {
    if (isAddingCompetitor) return
    const cleaned = cleanDomainInput(newDomain)
    if (!cleaned) return
    setIsAddingCompetitor(true)
    void logAnalysis(cleaned, emailId)
    try {
      const label = cleaned.split('.')[0] ?? cleaned
      const name = label ? label.charAt(0).toUpperCase() + label.slice(1) : cleaned
      const competitor: Competitor = {
        id: `comp-${Date.now()}-manual`,
        name,
        domain: cleaned,
        matchScore: 60 + ((cleaned.length * 7) % 36),
      }
      const workflowCompetitors = [
        ...competitors.filter((c) => selectedIds.includes(c.id)),
        competitor,
      ]
      setCompetitors((prev) => [...prev, competitor])
      setSelectedIds((prev) => [...prev, competitor.id])
      setApiError('')
      setHasSearched(true)
      const companyName = domain.trim() || cleaned
      const result = await runAdsWorkflow(companyName, emailId, workflowCompetitors)
      if (result.success && result.dashboard) {
        setDashboard(result.dashboard)
        setAds(result.dashboard.ads)
        setAdsError('')
      } else {
        setAdsError(result.error ?? 'Something went wrong while analyzing the new competitor. Please try again.')
      }
      setHasFetchedAds(true)
      setIsModalOpen(false)
    } finally {
      setIsAddingCompetitor(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      {/* Top bar with primary CTA */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold leading-10 text-grey-900">AdScope</h1>
          <p className="mt-1 text-sm text-grey-600">
            Discover competitors for any domain and analyze their ads across platforms.
          </p>
        </div>
        <button
          type="button"
          className="ds-btn-primary self-start sm:self-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Add Extra Competitor
        </button>
      </header>

      {/* Domain input section */}
      <section className="ds-card mt-8 p-6">
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

      {/* Competitors table section */}
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
            <div className="flex items-center justify-between gap-4 border-t border-grey-200 px-6 py-4">
              <p className="text-xs text-grey-500">
                Select competitors to fetch their live ads.
              </p>
              <button
                type="button"
                className="ds-btn-primary"
                disabled={selectedIds.length === 0 || isFetchingAds}
                onClick={handleGetAds}
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

      {/* Ads results section */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-grey-600" />
          <h2 className="text-lg font-semibold text-grey-900">Ad Analysis</h2>
        </div>

        {isFetchingAds ? (
          <div className="ds-card mt-4 flex flex-col items-center justify-center gap-3 px-6 py-16 text-grey-600">
            <Spinner size="md" className="text-brand" />
            <p className="text-sm">Running the ads analysis workflow...</p>
          </div>
        ) : ads.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        ) : (
          <div className="ds-card mt-4 px-6 py-16 text-center">
            {adsError ? (
              <>
                <p className="text-sm font-medium text-errords">Could not fetch ads</p>
                <p className="mt-1 text-xs text-grey-500">{adsError}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-grey-700">
                  {hasFetchedAds ? 'No ads available' : 'No ads fetched yet'}
                </p>
                <p className="mt-1 text-xs text-grey-500">
                  {hasFetchedAds
                    ? 'The selected competitors are not running any ads right now.'
                    : 'Select competitors above and click "Get Ads for Selected" to see their ads.'}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* Ad intelligence dashboard */}
      {dashboard && !isFetchingAds && <AdsDashboard data={dashboard} />}

      <AddCompetitorModal
        isOpen={isModalOpen}
        isSubmitting={isAddingCompetitor}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddCompetitor}
      />
    </div>
  )
}
