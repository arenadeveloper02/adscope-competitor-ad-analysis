'use server'

import { prisma } from '@/lib/prisma'
import type { ActionResult, Competitor, CompetitorSearchResult } from '@/lib/types'

export async function logAnalysis(domain: string, emailId: string): Promise<ActionResult> {
  try {
    if (!domain.trim()) {
      return { success: false, error: 'Domain is required' }
    }
    await prisma.analysisSession.create({
      data: {
        domain: domain.trim(),
        emailId: emailId || 'unknown',
      },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to log analysis session' }
  }
}

const COMPETITOR_SEARCH_ENDPOINT =
  'https://agent.thearena.ai/api/workflows/a5a9fda5-1a2d-4c60-b818-82897efae436/execute'

const COMPETITOR_SEARCH_API_KEY = 'sk-sim-vTPTbbRj94Pf9YjOyjNthKyXig5NLD1F'

const COMPETITOR_SEARCH_COOKIE =
  'AWSALB=0pW9//ob33hd6Jof2VVkLLwdUtYN1S9n26EosfsQO/Oamm/3cvT7oYM/lNmjMQEW8AMMSrni2GEDsGNsw+AlBU7SogaKDwLqJFp1XL1qR2/rgI00jyQsTU2ft499; AWSALBCORS=0pW9//ob33hd6Jof2VVkLLwdUtYN1S9n26EosfsQO/Oamm/3cvT7oYM/lNmjMQEW8AMMSrni2GEDsGNsw+AlBU7SogaKDwLqJFp1XL1qR2/rgI00jyQsTU2ft499'

function cleanDomainValue(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace('%', '').trim())
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function extractCompetitorArray(value: unknown, depth: number): unknown[] | null {
  if (depth > 6 || value === null || value === undefined) return null
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null
    try {
      const parsed: unknown = JSON.parse(trimmed)
      return extractCompetitorArray(parsed, depth + 1)
    } catch {
      return null
    }
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferredKeys = [
      'competitors',
      'data',
      'results',
      'result',
      'output',
      'response',
      'items',
      'body',
      'content',
    ]
    for (const key of preferredKeys) {
      if (key in record) {
        const found = extractCompetitorArray(record[key], depth + 1)
        if (found) return found
      }
    }
    for (const nested of Object.values(record)) {
      const found = extractCompetitorArray(nested, depth + 1)
      if (found) return found
    }
  }
  return null
}

function toCompetitor(entry: unknown, index: number, seedTag: number): Competitor | null {
  if (typeof entry !== 'object' || entry === null) return null
  const record = entry as Record<string, unknown>
  const rawName = pickString(record, [
    'name',
    'competitor_name',
    'competitorName',
    'company_name',
    'companyName',
    'company',
    'title',
  ])
  const rawDomain = pickString(record, [
    'domain',
    'competitor_domain',
    'competitorDomain',
    'company_domain_url',
    'company_domain',
    'website',
    'url',
  ])
  if (!rawName && !rawDomain) return null
  const domain = rawDomain ? cleanDomainValue(rawDomain) : ''
  let name = rawName
  if (!name && domain) {
    const label = domain.split('.')[0] ?? domain
    name = label ? label.charAt(0).toUpperCase() + label.slice(1) : domain
  }
  if (!name) return null
  const rawScore = pickNumber(record, [
    'matchScore',
    'match_score',
    'relevance',
    'relevance_score',
    'relevanceScore',
    'score',
    'similarity',
    'similarity_score',
  ])
  let matchScore: number
  if (rawScore !== null) {
    matchScore = rawScore > 0 && rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore)
  } else {
    matchScore = 95 - index * 6
  }
  matchScore = Math.min(100, Math.max(1, matchScore))
  return {
    id: `comp-${seedTag}-${index}`,
    name,
    domain: domain || 'unknown',
    matchScore,
  }
}

export async function searchCompetitors(domain: string): Promise<CompetitorSearchResult> {
  const trimmed = domain.trim()
  if (!trimmed) {
    return { success: false, error: 'Please enter a domain URL to analyze.' }
  }
  try {
    const response = await fetch(COMPETITOR_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': COMPETITOR_SEARCH_API_KEY,
        'Content-Type': 'application/json',
        Cookie: COMPETITOR_SEARCH_COOKIE,
      },
      body: JSON.stringify({ company_domain_url: trimmed }),
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        success: false,
        error: `The competitor search service returned an error (status ${response.status}). Please try again in a moment.`,
      }
    }
    const payload: unknown = await response.json()
    const rawEntries = extractCompetitorArray(payload, 0)
    if (!rawEntries) {
      return {
        success: false,
        error: 'No competitors were found for this domain. Try a different domain or add a competitor manually.',
      }
    }
    const seedTag = Date.now()
    const competitors: Competitor[] = []
    rawEntries.forEach((entry, index) => {
      const competitor = toCompetitor(entry, index, seedTag)
      if (competitor) competitors.push(competitor)
    })
    if (competitors.length === 0) {
      return {
        success: false,
        error: 'No competitors were found for this domain. Try a different domain or add a competitor manually.',
      }
    }
    return { success: true, competitors }
  } catch {
    return {
      success: false,
      error: 'Unable to reach the competitor search service. Please check your connection and try again.',
    }
  }
}
