"use client"

import { useState } from 'react'
import { ChevronDown, Images, Lightbulb, MessageSquareText, Plus, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Competitor, DashboardTab } from '@/lib/types'

interface TabItem {
  id: DashboardTab
  label: string
  icon: LucideIcon
}

const TAB_ITEMS: TabItem[] = [
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'gallery', label: 'Ad Gallery', icon: Images },
  { id: 'competitors', label: 'Competitors', icon: Users },
  { id: 'creative', label: 'Creative Analysis', icon: MessageSquareText },
]

interface TopNavProps {
  companyName: string
  competitors: Competitor[]
  activeCompetitorIds: string[]
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onAddCompetitor: () => void
  onToggleCompetitor: (id: string) => void
  showTabs: boolean
}

export default function TopNav({
  companyName,
  competitors,
  activeCompetitorIds,
  activeTab,
  onTabChange,
  onAddCompetitor,
  onToggleCompetitor,
  showTabs,
}: TopNavProps) {
  // Dropdown listing the current active/analyzed competitors with checkbox include/exclude
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-grey-200 bg-white">
      {/* Top row: logo/title block on the left, competitor dropdown (post-dashboard only) + Add Competitor action on the right */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ds bg-brand text-white">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-grey-900">Ad Intelligence</p>
            <p className="truncate text-xs text-grey-500">{companyName || 'Competitor Tracker'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Competitor management dropdown — hidden until the dashboard has loaded */}
          {showTabs && (
            <div className="relative">
              <button
                type="button"
                className="ds-btn-secondary"
                onClick={() => setIsDropdownOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                aria-label="Manage competitors"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Competitors</span>
                <span className="inline-flex items-center rounded-full bg-brand-surface px-2 py-0.5 text-xs font-semibold text-brand">
                  {activeCompetitorIds.length}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-ds-lg border border-grey-200 bg-white p-2 shadow-ds-lg">
                  <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-grey-500">
                    Active Competitors
                  </p>
                  {competitors.length === 0 ? (
                    <p className="px-3 pb-2 text-xs text-grey-500">No competitors yet</p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto">
                      {competitors.map((competitor) => {
                        const isActive = activeCompetitorIds.includes(competitor.id)
                        return (
                          <li
                            key={competitor.id}
                            className="flex items-center gap-3 rounded-ds px-3 py-2 hover:bg-grey-50"
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => onToggleCompetitor(competitor.id)}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-grey-300 accent-brand"
                              aria-label={`Include ${competitor.name} in analysis`}
                            />
                            <span className="min-w-0">
                              <span
                                className={`block truncate text-sm font-medium ${
                                  isActive ? 'text-grey-900' : 'text-grey-400'
                                }`}
                              >
                                {competitor.name}
                              </span>
                              <span className="block truncate text-xs text-grey-500">{competitor.domain}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="ds-btn-primary"
            onClick={onAddCompetitor}
            aria-label="Add a competitor"
          >
            <Plus className="h-5 w-5" />
            Add Competitor
          </button>
        </div>
      </div>

      {/* Secondary navigation bar below the top header — visible only after ads are fetched */}
      {showTabs && (
        <nav className="border-t border-grey-100 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6">
            {TAB_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`inline-flex items-center gap-2 rounded-ds px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-surface text-brand' : 'text-grey-700 hover:bg-grey-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-brand' : 'text-grey-500'}`} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
