"use client"

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddCompetitorModalProps {
  open: boolean
  onClose: () => void
  onAdd: (domain: string) => void
}

export default function AddCompetitorModal({ open, onClose, onAdd }: AddCompetitorModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!value.trim()) {
      setError('Please enter a competitor domain.')
      return
    }
    setError('')
    onAdd(value)
    setValue('')
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(44, 45, 51, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Add competitor"
    >
      <div className="ds-card w-full max-w-md p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-grey-900">Add Competitor</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-grey-500 hover:bg-grey-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-grey-600">
          Enter the competitor&apos;s domain. It will be added to the selection so you can re-run the ads
          analysis.
        </p>
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. competitor.com"
            className="ds-input"
            aria-label="Competitor domain"
          />
          {error && (
            <p className="mt-2 text-sm" style={{ color: '#F31A1A' }}>
              {error}
            </p>
          )}
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
