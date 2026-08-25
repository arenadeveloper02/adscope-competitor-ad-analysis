# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T17:53:57.510Z.

## Overview

Competitor ad analysis dashboard: discover competitors for any domain, trigger the ads intelligence workflow, and explore market insights, ad gallery, competitor intel, and creative analysis.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 40

## Features

- Domain-based competitor discovery via Arena workflow
- Add competitors manually with a modal
- Trigger + poll ads analysis workflow
- Market Insights dashboard with KPIs, scorecards, and heatmap
- Ad Gallery with search and format filters
- Competitor Intel deep-dive
- Creative Analysis of keywords, messaging, and headlines
- Server-side session snapshot persistence keyed by Arena emailId

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
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

## File Inventory

### App pages

- `app/access-denied/page.tsx`
- `app/arena-ds-tokens.css`
- `app/error.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

### Components

- `components/AdCard.tsx`
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
- `app/error.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/AdCard.tsx`
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

- **Updated at:** 2026-08-25T17:53:57.510Z
- **Request:** FIX THE BUILD FAILURE ONLY — definitive data-safe resolution. Do not modify, refactor, remove, or "clean up" any other part of the code. Preserve all existing formatting, naming, comments, and logic. Do NOT touch any UI components, the Creative Analysis visuals, the ad-card links, the Add Competitor modal, the trigger+poll flow, or refresh persistence — those are all working and must stay exactly as they are.

PROBLEM (still failing after trying to reconcile the schema):
The Vercel build fails during `npm run build` because the build script is `prisma generate && prisma db push && next build`. The `prisma db push` step keeps detecting drift against the live Neon database and wants to DROP the `AdIntelligenceReport` table, which already contains 4 rows of real data:
  code: potential_dataloss — "You are about to drop the `AdIntelligenceReport` table, which is not empty (4 rows)."
Reconciling the schema by hand did not work because the exact live table structure cannot be reliably guessed, so the diff still wants to drop the table. The build must succeed WITHOUT dropping the table and WITHOUT losing the 4 rows.

REQUIRED FIX — stop the build from running a destructive schema push:
1. In package.json, change the "build" script so it NO LONGER runs `prisma db push` during the Vercel build. The table already exists in the Neon database with the correct structure, so the build only needs to generate the client and build Next.js.
   - Change build from:  "prisma generate && prisma db push && next build"
     to:                 "prisma generate && next build"
   - This removes the destructive push entirely. `prisma generate` still runs so the Prisma Client is available at build time; `next build` runs normally. No `db push` = no DROP TABLE = no potential_dataloss = build passes, and the existing 4 rows are preserved.
2. Do NOT add --accept-data-loss anywhere (that would delete data). The correct resolution is to not push schema during build at all.
3. Do NOT delete or alter the prisma/schema.prisma models, the DATABASE_URL usage, or any runtime Prisma Client queries in the app — those must keep working against the existing table.
4. If any schema migration is ever genuinely needed later, it should be done manually/out-of-band, not during the Vercel build. For now, just make the build script `prisma generate && next build`.

CONSTRAINTS:
- Only touch the package.json "build" script (and "postinstall"/scripts ONLY if one of them also runs `prisma db push` and would re-trigger the drop — in that case remove the push from there too). Nothing else.
- Do not change variable names, code style, UI, or app logic.
- Do not add features or refactors.
- After implementing, show the exact before/after of the package.json build script (and any other script you changed) and confirm that `prisma db push` no longer runs during the build.
