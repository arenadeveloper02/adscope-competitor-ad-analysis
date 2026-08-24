"use client"

import {
  Images,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  Target,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Competitor } from '@/lib/types'

interface NavItem {
  id: string
  label: string
  sub: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'insights', label: 'Insights', sub: 'Market intelligence', icon: Lightbulb },
  { id: 'overview', label: 'Overview', sub: 'Charts & summary', icon: LayoutDashboard },
  { id: 'gallery', label: 'Ad Gallery', sub: 'Browse all creatives', icon: Images },
  { id: 'competitors', label: 'Competitors', sub: 'Deep competitor intel', icon: Users },
  { id: 'creative', label: 'Creative Analysis', sub: 'Keywords & messaging', icon: MessageSquareText },
]

interface SidebarProps {
  companyName: string
  selectedCompetitors: Competitor[]
  activeSection: string
  onNavigate: (sectionId: string) => void
}

export default function Sidebar({
  companyName,
  selectedCompetitors,
  activeSection,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-grey-200 bg-white lg:flex">
      {/* Header: logo + title + subtitle */}
      <div className="flex items-center gap-3 border-b border-grey-100 px-5 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ds bg-brand text-white">
          <Target className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-grey-900">Ad Intelligence</p>
          <p className="truncate text-xs text-grey-500">Competitor Tracker</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-start gap-3 rounded-ds px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-brand-surface text-brand' : 'text-grey-700 hover:bg-grey-50'
                }`}
              >
                <item.icon className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? 'text-brand' : 'text-grey-500'}`} />
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${isActive ? 'text-brand' : 'text-grey-900'}`}>
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-grey-500">{item.sub}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Dynamic selected state: company + selected competitors */}
        <div className="mt-6 border-t border-grey-100 pt-4">
          <p className="px-3 text-[10px] font-medium uppercase tracking-wide text-grey-500">Company</p>
          <p className="mt-1 truncate px-3 text-sm font-semibold text-grey-900">
            {companyName || 'No company selected'}
          </p>
          <p className="mt-4 px-3 text-[10px] font-medium uppercase tracking-wide text-grey-500">
            Selected Competitors
          </p>
          {selectedCompetitors.length === 0 ? (
            <p className="mt-1 px-3 text-xs text-grey-500">None selected yet</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {selectedCompetitors.map((competitor) => (
                <li key={competitor.id} className="rounded-ds px-3 py-1">
                  <span className="block truncate text-xs font-medium text-grey-900">{competitor.name}</span>
                  <span className="block truncate text-[10px] text-grey-500">{competitor.domain}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
    </aside>
  )
}
