# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-10-26T06:54:05.361Z.

## Overview

Competitor ad analysis dashboard: discover competitors for a domain, trigger the ads-intelligence workflow (API 1), poll the DB-backed Get workflow (API 2) every 20s while it runs, and explore results across Market Insights, Ad Gallery, Competitors, and Creative Analysis tabs.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 41

## Features

- Domain-based competitor discovery
- API 1 trigger with exact competitorDetails payload + 20s API 2 polling + final API 2 fetch
- Long-run (8-12 min) status message while the analysis executes
- Refresh loading spinner while the saved DB snapshot restores
- Competitors tab, Creative Analysis keyword drill-down with per-competitor columns and View all ads buttons
- Server-side snapshot persistence keyed by Arena emailId

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Infrastructure

- **DATABASE_URL:** set on Vercel when Neon is connected — do not commit real credentials

## Routes & Pages

- `/` — `app/page.tsx`
- `/access-denied` — `app/access-denied/page.tsx`

## Database Models

- `AppSetting`
- `AnalysisSession`
- `DashboardSnapshot`
- `SheetExport`

## Prisma Schema — STRICT: NEVER DROP OR DELETE COLUMNS

This section is binding on every edit. Vercel deploy runs `prisma db push` with **NO** `--accept-data-loss`. Dropping or altering a live column **fails the deploy**.

**FORBIDDEN (non-negotiable):**
- Do **not** delete, drop, omit, rename, or retype ANY existing column in `prisma/schema.prisma`
- Do **not** drop models or tables
- Do **not** "clean up", "simplify", or regenerate the schema from memory or from this summary
- Do **not** remove `createdAt` / `updatedAt` (or any other listed field) even if the UI no longer uses it

**ALLOWED:**
- ADD new models, columns, relations, or enums only
- New columns on existing models MUST be optional (`?`) or have `@default(...)`
- If the UI no longer needs a field, stop reading it in code — leave the column in the schema unchanged

**Immutable columns (must remain identical — same name, same type):**

- `AppSetting`: `id String`, `key String`, `value String`, `createdAt DateTime`, `updatedAt DateTime`
- `AnalysisSession`: `id String`, `domain String`, `emailId String`, `createdAt DateTime`, `updatedAt DateTime`
- `DashboardSnapshot`: `id String`, `emailId String`, `domain String`, `payload String`, `createdAt DateTime`, `updatedAt DateTime`
- `SheetExport`: `id String`, `companyName String`, `emailId String`, `payload String`, `createdAt DateTime`, `updatedAt DateTime`

## File Inventory

### App pages

- `app/access-denied/page.tsx`
- `app/arena-ds-tokens.css`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

### Components

- `components/AdCard.tsx`
- `components/AdDetailModal.tsx`
- `components/AdGallery.tsx`
- `components/AddCompetitorModal.tsx`
- `components/AdsDashboard.tsx`
- `components/CompetitorIntel.tsx`
- `components/CompetitorsTable.tsx`
- `components/CreativeAnalysis.tsx`
- `components/DashboardClient.tsx`
- `components/Sidebar.tsx`
- `components/Spinner.tsx`
- `components/TopNav.tsx`
- `components/arena-email-provider.tsx`

### Libraries

- `lib/actions.ts`
- `lib/ad-display.ts`
- `lib/arena-email-constants.ts`
- `lib/arena-email.ts`
- `lib/dashboard-actions.ts`
- `lib/mock-api.ts`
- `lib/prisma.ts`
- `lib/session-actions.ts`
- `lib/sheet-actions.ts`
- `lib/snapshot-actions.ts`
- `lib/types.ts`
- `prisma/schema.prisma`

### Config

- `.env.example`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

### Other

- `README.md`
- `REPO_SUMMARY.md`

## Complete File Index

- `.env.example`
- `README.md`
- `REPO_SUMMARY.md`
- `app/access-denied/page.tsx`
- `app/arena-ds-tokens.css`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/AdCard.tsx`
- `components/AdDetailModal.tsx`
- `components/AdGallery.tsx`
- `components/AddCompetitorModal.tsx`
- `components/AdsDashboard.tsx`
- `components/CompetitorIntel.tsx`
- `components/CompetitorsTable.tsx`
- `components/CreativeAnalysis.tsx`
- `components/DashboardClient.tsx`
- `components/Sidebar.tsx`
- `components/Spinner.tsx`
- `components/TopNav.tsx`
- `components/arena-email-provider.tsx`
- `lib/actions.ts`
- `lib/ad-display.ts`
- `lib/arena-email-constants.ts`
- `lib/arena-email.ts`
- `lib/dashboard-actions.ts`
- `lib/mock-api.ts`
- `lib/prisma.ts`
- `lib/session-actions.ts`
- `lib/sheet-actions.ts`
- `lib/snapshot-actions.ts`
- `lib/types.ts`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `postcss.config.mjs`
- `prisma/schema.prisma`
- `tailwind.config.ts`
- `tsconfig.json`

## Latest Change

- **Updated at:** 2026-10-26T06:54:05.361Z
- **Request:** Implement the following functionality in the codebase. CRITICAL INSTRUCTION: Do NOT revert, remove, or modify previous fixes. The modal CSS fixes, the sticky header, the 6-month date restriction, and the existing UI layouts must remain exactly as they are. Only apply the following specific changes:

Changes to implement:

Update API 1 Execution & API 2 Polling (handleGetAdsForSelected):

API 1 Payload: When triggering POST [https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute](https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute), ensure the payload matches this exact structure:

JSON
{
  "companyName": companyDomain,
  "email": userEmail,
  "competitorDetails": selectedCompetitors.map(comp => ({
    "company_domain_url": companyDomainUrl, 
    "company_name": companyName,
    "competitor_description": comp.description || "",
    "competitor_domain_url": comp.competitorDomain,
    "name": comp.competitorName
  }))
}
API 2 Polling: Immediately after firing API 1 (while waiting for its response), start a setInterval that fires API 2 (.../44a45367.../execute) every 20 seconds to fetch and render the currently available data in the database. The payload for API 2 must be {"email": userEmail, "company_name": companyDomain}.

Final API 2 Trigger: Await the response of API 1. If it returns { "success": true, "output": { "result": { "status": "success" } } }, clear the 20-second polling interval and fire API 2 one last time to fetch the fully completed dataset and update the dashboard UI.

Loading States & Messages:

Long-run Message: While API 1 is executing, display this polished, user-friendly message on the UI: "Analyzing competitor ads... This process takes 8-12 minutes. Please keep this tab open, or refresh the page later to view your results." Keep this message visible until the final API 2 call completes.

Refresh Loading State: Ensure that when the user refreshes the page (triggering the initial API 2 fetch), a standard loading spinner or message is shown until the existing database data is loaded.

Rename Navigation Tab:

Locate the secondary navigation tabs. Find the string "Competitor Intel" and rename it exactly to "Competitors".

Add Competitor Keyword Drill-down Visuals (Creative Analysis Tab):

In the Creative Analysis tab, below the main charts, add a multi-column grid layout (one column per competitor, e.g., Inspire Aesthetics, Dr. Dana MD, Sono Bello).

Inside each competitor's column, render a list of their top keywords (e.g., "plastic surgery delray beach", "botox", "juvederm") alongside their respective volume counts (e.g., 20). Render these as horizontal progress bars or list items.

At the bottom of each keyword list, render a button that says "View all [X] ads" (where X is the competitor's total ads).

Interactivity: Ensure these keyword items and the "View all ads" buttons are clickable (cursor-pointer). Wire their onClick events so that clicking them filters the Ad Gallery tab to show ads for that specific competitor or keyword.

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not accidentally delete or overwrite any previous CSS or UI layout changes.

After implementing, list exactly which files and lines were changed, and why.
