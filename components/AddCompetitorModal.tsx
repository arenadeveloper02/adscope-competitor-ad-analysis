"use client"

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Competitor } from '@/lib/types'

interface AddCompetitorModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (competitor: Competitor) => void
}

function cleanDomainInput(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

export default function AddCompetitorModal({ isOpen, onClose, onAdd }: AddCompetitorModalProps) {
  const [name, setName] = useState('')
  const [domainValue, setDomainValue] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleaned = cleanDomainInput(domainValue)
    if (!cleaned) {
      setError('Please enter a valid competitor domain.')
      return
    }
    const label = cleaned.split('.')[0] ?? cleaned
    const fallbackName = label ? label.charAt(0).toUpperCase() + label.slice(1) : cleaned
    const competitor: Competitor = {
      id: `comp-${Date.now()}-manual`,
      name: name.trim() || fallbackName,
      domain: cleaned.includes('.') ? cleaned : `${cleaned}.com`,
      matchScore: 75,
    }
    onAdd(competitor)
    setName('')
    setDomainValue('')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(44, 45, 51, 0.72)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-grey-900">Add Competitor</h2>
            <p className="mt-1 text-xs text-grey-500">
              Manually add a competitor to include it in the ads analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-grey-500 transition-colors hover:bg-grey-50 hover:text-grey-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="add-competitor-domain" className="text-xs font-medium text-grey-700">
              Competitor domain
            </label>
            <input
              id="add-competitor-domain"
              type="text"
              value={domainValue}
              onChange={(e) => {
                setDomainValue(e.target.value)
                if (error) setError('')
              }}
              placeholder="e.g. competitor.com"
              className="ds-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="add-competitor-name" className="text-xs font-medium text-grey-700">
              Competitor name (optional)
            </label>
            <input
              id="add-competitor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Competitor Inc."
              className="ds-input mt-1"
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#F31A1A' }}>
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="ds-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ds-btn-primary">
              <Plus className="h-4 w-4" />
              Add Competitor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
