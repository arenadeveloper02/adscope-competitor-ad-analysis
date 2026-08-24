"use client"

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import Spinner from '@/components/Spinner'

interface AddCompetitorModalProps {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (domain: string) => void
}

export default function AddCompetitorModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: AddCompetitorModalProps) {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return
    const trimmed = domain.trim()
    if (!trimmed) {
      setError('Please enter a competitor domain.')
      return
    }
    setError('')
    onSubmit(trimmed)
    setDomain('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-grey-900/70 backdrop-blur-sm"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-ds-lg border border-grey-200 bg-white p-6 shadow-ds-xlg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-grey-900">Add Extra Competitor</h2>
            <p className="mt-1 text-sm text-grey-600">
              Enter a domain and we will fetch its ads automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-ds p-1 text-grey-500 transition-colors hover:bg-grey-50 hover:text-grey-700 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5">
          <label htmlFor="extra-competitor-domain" className="block text-xs font-medium tracking-wide text-grey-700">
            Competitor Domain
          </label>
          <input
            id="extra-competitor-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. rivalbrand.com"
            className="ds-input mt-2 border-grey-300 bg-white text-grey-900 placeholder:text-grey-400"
            disabled={isSubmitting}
          />
          {error && <p className="mt-2 text-xs text-errords">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="ds-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="ds-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
