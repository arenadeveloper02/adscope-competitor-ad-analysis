"use client"

import { Images, Lightbulb, MessageSquareText, Plus, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardTab } from '@/lib/types'

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
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onAddCompetitor: () => void
  showTabs: boolean
}

export default function TopNav({
  companyName,
  activeTab,
  onTabChange,
  onAddCompetitor,
  showTabs,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-grey-200 bg-white">
      {/* Top row: logo/title block on the left, Add Competitor action on the right */}
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
