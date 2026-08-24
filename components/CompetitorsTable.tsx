"use client"

import type { Competitor } from '@/lib/types'

interface CompetitorsTableProps {
  competitors: Competitor[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
}

function scoreBadgeClass(score: number): string {
  if (score >= 85) return 'bg-success-surface text-success-deep'
  if (score >= 70) return 'bg-warning-surface text-warning-deep'
  return 'bg-grey-100 text-grey-700'
}

export default function CompetitorsTable({
  competitors,
  selectedIds,
  onToggle,
  onToggleAll,
}: CompetitorsTableProps) {
  const allSelected = competitors.length > 0 && selectedIds.length === competitors.length

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-grey-200 bg-grey-50">
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 cursor-pointer rounded border-grey-300 accent-brand"
                aria-label="Select all competitors"
              />
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-grey-600">
              Competitor Name
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-grey-600">
              Competitor Domain
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-grey-600">
              Match Score
            </th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((competitor) => {
            const isSelected = selectedIds.includes(competitor.id)
            return (
              <tr
                key={competitor.id}
                className={`cursor-pointer border-b border-grey-100 transition-colors ${
                  isSelected ? 'bg-brand-surface' : 'hover:bg-grey-50'
                }`}
                onClick={() => onToggle(competitor.id)}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(competitor.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer rounded border-grey-300 accent-brand"
                    aria-label={`Select ${competitor.name}`}
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-grey-900">{competitor.name}</td>
                <td className="px-4 py-3 text-sm text-grey-600">{competitor.domain}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${scoreBadgeClass(
                      competitor.matchScore
                    )}`}
                  >
                    {competitor.matchScore}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
