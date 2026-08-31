"use client"

import { useState } from 'react'
import { ChevronDown, Megaphone, Plus } from 'lucide-react'
import type { Competitor } from '@/lib/types'

interface TopNavProps {
  competitors: Competitor[]
  selectedIds: string[]
  hasFetchedAds: boolean
  onToggleCompetitor: (id: string) => void
  onAddCompetitor: () => void
}

export default function TopNav({
  competitors,
  selectedIds,
  hasFetchedAds,
  onToggleCompetitor,
  onAddCompetitor,
}: TopNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-grey-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
            <Megaphone className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="text-base font-semibold leading-5 text-grey-900">AdScope</p>
            <p className="text-xs text-grey-500">Competitor Ad Analysis</p>
          </div>
        </div>

        {hasFetchedAds && (
          <div className="flex items-center gap-2">
            {competitors.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="ds-btn-secondary"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                >
                  Competitors ({selectedIds.length}/{competitors.length})
                  <ChevronDown className="h-4 w-4" />
                </button>
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-grey-200 bg-white p-2 shadow-lg"
                    role="menu"
                  >
                    <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-grey-500">
                      Included in analysis
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                      {competitors.map((competitor) => {
                        const isChecked = selectedIds.includes(competitor.id)
                        return (
                          <label
                            key={competitor.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-grey-50"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleCompetitor(competitor.id)}
                              className="h-4 w-4 cursor-pointer rounded border-grey-300 accent-brand"
                              aria-label={`Include ${competitor.name}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-grey-900">
                                {competitor.name}
                              </span>
                              <span className="block truncate text-xs text-grey-500">
                                {competitor.domain}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="ds-btn-primary !bg-brand-600 !text-white hover:!bg-brand-700 active:!bg-brand-800"
              onClick={onAddCompetitor}
            >
              <Plus className="h-4 w-4" />
              Add Competitor
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
