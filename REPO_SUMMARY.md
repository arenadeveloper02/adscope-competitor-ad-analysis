# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T17:47:19.288Z.

## Overview

Build-failure fix only: restored the AdIntelligenceReport model to prisma/schema.prisma so `prisma db push` no longer attempts to DROP the live `AdIntelligenceReport` table (which holds 4 real rows). The regenerated schema had omitted this model entirely, causing Prisma to plan a destructive DROP TABLE and fail the deploy with the --accept-data-loss warning. Fix: re-added the model with its original table name (no @@map rename), id primary key, emailId/companyName/domain scoping columns, payload text column, and createdAt/updatedAt timestamps — all data-bearing columns restored with their prior names/types, and every re-added scalar is either the primary key, nullable, or carries @default(...) / @updatedAt @default(now()) so the diff is additive-only or a no-op against the existing rows. AnalysisSession, DashboardSnapshot, and SheetExport models are unchanged (byte-identical field lines) and continue to back logAnalysis(), the snapshot persistence, and sheet exports. The build script remains `prisma generate && prisma db push && next build` with NO --accept-data-loss and NO --force-reset. No UI, actions, types, or logic files were touched. Files changed: prisma/schema.prisma (restored AdIntelligenceReport model — before: model absent, triggering DROP TABLE; after: model present matching the live table, so prisma db push detects no destructive change). app/not-found.tsx is echoed with the canonical zero-import template as required by structure validation.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 40

## Features

- Competitor discovery for any domain via Arena workflow
- Ads analysis dashboard with KPIs, scorecards, heatmap, CTAs, and messaging themes
- Ad gallery with per-platform creatives
- Creative analysis with keyword insights
- DB-backed session snapshots keyed by Arena emailId (refresh-safe)
- Sheet export of dashboard data
- Ad intelligence report storage preserved (AdIntelligenceReport table restored non-destructively)

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

- `AnalysisSession`
- `DashboardSnapshot`
- `SheetExport`
- `AdIntelligenceReport`

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

- **Updated at:** 2026-08-25T17:47:19.288Z
- **Request:** FIX THE BUILD FAILURE ONLY. Do not modify, refactor, remove, or "clean up" any other part of the code. Preserve all existing formatting, naming, comments, and logic. Do NOT touch any UI components, the Creative Analysis visuals, the ad-card links, the Add Competitor modal, the trigger+poll flow, or refresh persistence — those are all working and must stay exactly as they are.

PROBLEM:
The Vercel build fails during `npm run build` (which runs `prisma generate && prisma db push && next build`) with:
  "Use the --accept-data-loss flag to ignore the data loss warnings"
  "You are about to drop the `AdIntelligenceReport` table, which is not empty (4 rows)."
The regenerated prisma/schema.prisma no longer matches the existing Neon Postgres database, so `prisma db push` wants to DROP and recreate the `AdIntelligenceReport` table — which already holds 4 rows of real data. This is a NON-destructive schema drift that must be reconciled WITHOUT dropping the table or losing data.

REQUIRED FIX (data-safe — do NOT use --accept-data-loss, do NOT drop the table):
1. Inspect the current `AdIntelligenceReport` model in prisma/schema.prisma and restore it so it MATCHES the existing database table structure that already contains the 4 rows. The goal is that `prisma db push` detects NO destructive change (no DROP TABLE, no dropped/renamed non-null columns) for AdIntelligenceReport.
   - Do not rename the model or its @@map table name.
   - Do not remove existing columns that hold data. If a column was accidentally removed/renamed/retyped in the regenerated schema, restore it to its prior name/type.
   - If new optional columns are genuinely needed, add them as NULLABLE (optional `?`) with a default so no data loss/backfill is required.
2. Ensure the model's fields, types, @id, @default, @map, and @@map exactly reflect the live table so the diff is additive-only or a no-op.
3. Keep the build script as `prisma generate && prisma db push && next build`. Do NOT add --accept-data-loss. The correct resolution is a non-destructive schema, not forcing data loss.
4. After the schema matches, `prisma db push` should succeed with no data-loss warning and `next build` should complete.

CONSTRAINTS:
- Only touch prisma/schema.prisma (and, only if strictly necessary to compile, the exact Prisma client type references that broke) — nothing else.
- Do not change variable names, code style, or any UI/logic outside the Prisma schema reconciliation.
- Do not add features or refactors.
- After implementing, list exactly which file(s) and lines changed, what the AdIntelligenceReport model looked like before vs after, and why this avoids the data-loss drop.
