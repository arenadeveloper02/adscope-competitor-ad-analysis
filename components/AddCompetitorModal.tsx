"use client"

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddCompetitorModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (domain: string) => void
}

export default function AddCompetitorModal({ isOpen, onClose, onAdd }: AddCompetitorModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Please enter a competitor domain.')
      return
    }
    setError('')
    onAdd(trimmed)
    setValue('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add a competitor"
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(44, 45, 51, 0.72)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="ds-card relative w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-grey-900">Add Competitor</h2>
            <p className="mt-1 text-sm text-grey-600">
              Add a competitor domain to include it in the analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-ds p-1 text-grey-500 transition-colors hover:bg-grey-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. competitor.com"
            className="ds-input"
            aria-label="Competitor domain"
          />
          {error && <p className="mt-2 text-sm text-errords-deep">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="ds-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ds-btn-primary">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
