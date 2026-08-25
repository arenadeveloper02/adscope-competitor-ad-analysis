'use server'

import { prisma } from '@/lib/prisma'

/**
 * Returns the most recently analyzed domain for this Arena user, read from the
 * existing AnalysisSession log written by logAnalysis(). Used on page load to
 * restore the last run when the dashboard snapshot is missing or stale.
 * DB-backed persistence keyed by emailId — no browser storage is used.
 */
export async function getLastAnalyzedDomain(emailId: string): Promise<string | null> {
  try {
    if (!emailId.trim()) return null
    const session = await prisma.analysisSession.findFirst({
      where: { emailId },
      orderBy: { id: 'desc' },
    })
    return session?.domain ?? null
  } catch {
    return null
  }
}
