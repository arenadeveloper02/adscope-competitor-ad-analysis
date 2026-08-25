"use client"

import { useState } from 'react'
import { ChevronDown, Megaphone, Plus } from 'lucide-react'
import type { Competitor } from '@/lib/types'

interface TopNavProps {
  competitors: Competitor[]
  selectedIds: string[]
  showCompetitorControls: boolean
  onToggleCompetitor: (id: string) => void
  onAddCompetitor: () => void
}

export default function TopNav({
  competitors,
  selectedIds,
  showCompetitorControls,
  onToggleCompetitor,
  onAddCompetitor,
}: TopNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-grey-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold leading-5 text-grey-900">AdScope</p>
            <p className="text-xs text-grey-500">Competitor Ad Analysis</p>
          </div>
        </div>
        {showCompetitorControls && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                className="ds-btn-secondary"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
              >
                Competitors ({selectedIds.length})
                <ChevronDown className="h-4 w-4" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 z-40 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-grey-200 bg-white p-2 shadow-xl">
                  {competitors.map((competitor) => (
                    <label
                      key={competitor.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-grey-700 hover:bg-grey-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(competitor.id)}
                        onChange={() => onToggleCompetitor(competitor.id)}
                        className="h-4 w-4 cursor-pointer rounded border-grey-300 accent-brand"
                      />
                      <span className="truncate">{competitor.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="ds-btn-primary" onClick={onAddCompetitor}>
              <Plus className="h-4 w-4" />
              Add Competitor
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
