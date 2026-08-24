'use server'

import { prisma } from '@/lib/prisma'
import type { ActionResult } from '@/lib/types'

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
