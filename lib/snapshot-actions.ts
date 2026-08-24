'use server'

import { prisma } from '@/lib/prisma'
import type { ActionResult, SnapshotPayload, SnapshotResult } from '@/lib/types'

/**
 * Server-side session persistence keyed by the Arena emailId so browser
 * refreshes do not wipe out the searched domain, competitors, or metrics.
 */
export async function saveDashboardSnapshot(
  emailId: string,
  snapshot: SnapshotPayload
): Promise<ActionResult> {
  try {
    if (!emailId) return { success: false, error: 'Missing email id' }
    const payload = JSON.stringify(snapshot)
    await prisma.dashboardSnapshot.upsert({
      where: { emailId },
      update: { domain: snapshot.domain, payload },
      create: { emailId, domain: snapshot.domain, payload },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save session state' }
  }
}

export async function loadDashboardSnapshot(emailId: string): Promise<SnapshotResult> {
  try {
    if (!emailId) return { success: false, error: 'Missing email id' }
    const row = await prisma.dashboardSnapshot.findUnique({ where: { emailId } })
    if (!row) return { success: false }
    const parsed = JSON.parse(row.payload) as SnapshotPayload
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.competitors)) {
      return { success: false }
    }
    return { success: true, snapshot: parsed }
  } catch {
    return { success: false, error: 'Failed to load session state' }
  }
}

export async function clearDashboardSnapshot(emailId: string): Promise<ActionResult> {
  try {
    if (!emailId) return { success: false, error: 'Missing email id' }
    await prisma.dashboardSnapshot.deleteMany({ where: { emailId } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to clear session state' }
  }
}
