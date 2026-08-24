"use client"

import { FileSpreadsheet, Images, Lightbulb, RefreshCw, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardTab } from '@/lib/types'
import Spinner from '@/components/Spinner'

interface TabItem {
  id: DashboardTab
  label: string
  icon: LucideIcon
}

const TAB_ITEMS: TabItem[] = [
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'gallery', label: 'Ad Gallery', icon: Images },
  { id: 'competitors', label: 'Competitors', icon: Users },
]

interface TopNavProps {
  companyName: string
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onSync: () => void
  onSheet: () => void
  isSyncing: boolean
  isExporting: boolean
  sheetMessage: string
}

export default function TopNav({
  companyName,
  activeTab,
  onTabChange,
  onSync,
  onSheet,
  isSyncing,
  isExporting,
  sheetMessage,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-grey-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ds bg-brand text-white">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-grey-900">Ad Intelligence</p>
            <p className="truncate text-xs text-grey-500">{companyName || 'Competitor Tracker'}</p>
          </div>
        </div>

        <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-center">
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
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="ds-btn-secondary"
            onClick={onSync}
            disabled={isSyncing}
            aria-label="Sync current dataset"
          >
            {isSyncing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            Sync
          </button>
          <button
            type="button"
            className="ds-btn-primary"
            onClick={onSheet}
            disabled={isExporting}
            aria-label="Export dashboard to spreadsheet storage"
          >
            {isExporting ? <Spinner /> : <FileSpreadsheet className="h-4 w-4" />}
            Sheet
          </button>
        </div>
      </div>
      {sheetMessage && (
        <div className="border-t border-grey-100 bg-grey-50 px-4 py-1.5 sm:px-6">
          <p className="mx-auto w-full max-w-6xl text-[11px] leading-4 text-grey-600">{sheetMessage}</p>
        </div>
      )}
    </header>
  )
}
