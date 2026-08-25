"use client"

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddCompetitorModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, domain: string, description?: string) => void
}

export default function AddCompetitorModal({ isOpen, onClose, onAdd }: AddCompetitorModalProps) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim() || !domain.trim()) {
      setError('Competitor name and domain are both required.')
      return
    }
    onAdd(name, domain, description.trim() ? description : undefined)
    setName('')
    setDomain('')
    setDescription('')
    setError('')
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(44, 45, 51, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Add competitor manually"
    >
      <div className="ds-card w-full max-w-md p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-grey-900">Add Competitor</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-grey-500 transition-colors hover:bg-grey-50 hover:text-grey-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-grey-500">
          Manually add a competitor to include in the ads analysis.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-grey-600" htmlFor="competitor-name">
              Competitor Name
            </label>
            <input
              id="competitor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Analytics"
              className="ds-input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-grey-600" htmlFor="competitor-domain">
              Competitor Domain
            </label>
            <input
              id="competitor-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. acme.com"
              className="ds-input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-grey-600" htmlFor="competitor-description">
              Description (optional)
            </label>
            <textarea
              id="competitor-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this competitor do?"
              rows={3}
              className="ds-input mt-1"
              style={{ height: 'auto', minHeight: '80px' }}
            />
          </div>
          {error && <p className="text-xs text-errords">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="ds-btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="ds-btn-primary">
              Add Competitor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
