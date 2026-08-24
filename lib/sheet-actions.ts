'use server'

import { prisma } from '@/lib/prisma'
import type { ActionResult, AdsDashboardData } from '@/lib/types'

/**
 * Exports the current dashboard dataset to spreadsheet storage (Postgres-backed
 * SheetExport table that syncs to Google Sheets).
 */
export async function exportDashboardToSheet(
  companyName: string,
  emailId: string,
  dashboard: AdsDashboardData
): Promise<ActionResult> {
  try {
    if (!dashboard || dashboard.scorecards.length === 0) {
      return { success: false, error: 'Nothing to export yet. Run an ads analysis first.' }
    }
    await prisma.sheetExport.create({
      data: {
        companyName: companyName.trim() || 'unknown',
        emailId: emailId || 'unknown',
        payload: JSON.stringify(dashboard),
      },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Export failed. Please try again.' }
  }
}
