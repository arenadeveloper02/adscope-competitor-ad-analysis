"use client"

import { Images, Search } from 'lucide-react'
import type { AdFormat, CompetitorAd } from '@/lib/types'
import AdCard, { deriveAdFormat } from '@/components/AdCard'

interface AdGalleryProps {
  ads: CompetitorAd[]
  search: string
  format: 'all' | AdFormat
  onSearchChange: (value: string) => void
  onFormatChange: (value: 'all' | AdFormat) => void
}

const FORMAT_FILTERS: Array<{ id: 'all' | AdFormat; label: string }> = [
  { id: 'all', label: 'All Formats' },
  { id: 'image', label: 'Image' },
  { id: 'text', label: 'Text' },
  { id: 'video', label: 'Video' },
]

export default function AdGallery({
  ads,
  search,
  format,
  onSearchChange,
  onFormatChange,
}: AdGalleryProps) {
  const query = search.trim().toLowerCase()
  const filtered = ads.filter((ad) => {
    if (format !== 'all' && deriveAdFormat(ad) !== format) return false
    if (!query) return true
    const haystack = `${ad.headline} ${ad.copy} ${ad.cta ?? ''} ${ad.competitorName} ${ad.platform}`.toLowerCase()
    return haystack.includes(query)
  })

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <Images className="h-5 w-5 text-grey-600" />
        <h2 className="text-lg font-semibold text-grey-900">Ad Gallery</h2>
      </div>

      <div className="ds-card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search headlines, copy, CTAs…"
            className="ds-input pl-11"
            aria-label="Search ads"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMAT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFormatChange(filter.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                format === filter.id
                  ? 'bg-brand text-white'
                  : 'border border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-grey-500">
        Showing {filtered.length} of {ads.length} ads
      </p>

      {filtered.length === 0 ? (
        <div className="ds-card mt-3 p-10 text-center">
          <p className="text-sm font-medium text-grey-700">No ads match your filters</p>
          <p className="mt-1 text-xs text-grey-500">Try a different search term or format.</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}
