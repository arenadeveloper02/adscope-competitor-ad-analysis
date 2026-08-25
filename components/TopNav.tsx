"use client"

import { useState } from 'react'
import { ChevronDown, Megaphone, Plus } from 'lucide-react'
import type { Competitor } from '@/lib/types'

interface TopNavProps {
  competitors: Competitor[]
  selectedIds: string[]
  showCompetitorMenu: boolean
  onToggleCompetitor: (id: string) => void
  onAddCompetitor: () => void
}

export default function TopNav({
  competitors,
  selectedIds,
  showCompetitorMenu,
  onToggleCompetitor,
  onAddCompetitor,
}: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-grey-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Megaphone className="h-4 w-4 text-white" />
          </span>
          <div>
            <p className="text-base font-semibold leading-5 text-grey-900">AdScope</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-grey-500">
              Competitor Ad Analysis
            </p>
          </div>
        </div>
        {showCompetitorMenu && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="ds-btn-secondary"
                style={{ height: '36px', fontSize: '14px' }}
              >
                Competitors ({selectedIds.length})
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-grey-200 bg-white p-2 shadow-lg">
                  {competitors.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-grey-500">No competitors yet</p>
                  ) : (
                    competitors.map((competitor) => (
                      <label
                        key={competitor.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-grey-700 hover:bg-grey-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(competitor.id)}
                          onChange={() => onToggleCompetitor(competitor.id)}
                          className="h-4 w-4 cursor-pointer rounded border-grey-300 accent-brand"
                          aria-label={`Toggle ${competitor.name}`}
                        />
                        <span className="truncate">{competitor.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onAddCompetitor}
              className="ds-btn-primary"
              style={{ height: '36px', fontSize: '14px' }}
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
