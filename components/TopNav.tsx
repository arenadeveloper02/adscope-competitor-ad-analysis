"use client"

import { useState } from 'react'
import { ChevronDown, Megaphone, Plus } from 'lucide-react'
import type { Competitor } from '@/lib/types'

interface TopNavProps {
  domain: string
  competitors: Competitor[]
  selectedIds: string[]
  showCompetitors: boolean
  onToggleCompetitor: (id: string) => void
  onAddCompetitor: () => void
}

export default function TopNav({
  domain,
  competitors,
  selectedIds,
  showCompetitors,
  onToggleCompetitor,
  onAddCompetitor,
}: TopNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-grey-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Megaphone className="h-4 w-4 text-white" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-4 text-grey-900">AdScope</p>
            <p className="text-[10px] text-grey-500">Competitor Ad Analysis</p>
          </div>
          {domain.trim() && (
            <span className="ml-2 hidden items-center rounded-full bg-grey-50 px-3 py-1 text-xs font-medium text-grey-700 sm:inline-flex">
              {domain.trim()}
            </span>
          )}
        </div>

        {showCompetitors && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-grey-200 bg-white px-3 py-1.5 text-xs font-medium text-grey-700 transition-colors hover:bg-grey-50"
                aria-expanded={open}
              >
                Competitors ({selectedIds.length}/{competitors.length})
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {open && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-lg border border-grey-200 bg-white p-2 shadow-lg">
                  {competitors.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-grey-500">No competitors yet</p>
                  ) : (
                    competitors.map((competitor) => (
                      <label
                        key={competitor.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-grey-700 hover:bg-grey-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(competitor.id)}
                          onChange={() => onToggleCompetitor(competitor.id)}
                          className="h-4 w-4 cursor-pointer rounded border-grey-300 accent-brand"
                          aria-label={`Toggle ${competitor.name}`}
                        />
                        <span className="flex-1 truncate">{competitor.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onAddCompetitor}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Competitor
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
