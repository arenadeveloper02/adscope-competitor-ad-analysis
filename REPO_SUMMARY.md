# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T11:10:44.722Z.

## Overview

AdScope — discover competitors for any domain and analyze their ads across platforms with an ad intelligence dashboard.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 33

## Features

- Competitor discovery for any domain via Arena workflow
- Selectable competitors table with match scores
- Ads workflow analysis producing a full ad intelligence dashboard
- KPI cards, scorecards, heatmap, keyword battlefield, CTA arsenal, messaging themes, strategic signals
- Add extra competitor with automatic analysis
- Sheet export of dashboard data
- Arena email gating via middleware and cookie

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
- `components/AddCompetitorModal.tsx`
- `components/AdsDashboard.tsx`
- `components/CompetitorsTable.tsx`
- `components/DashboardClient.tsx`
- `components/Sidebar.tsx`
- `components/Spinner.tsx`
- `components/arena-email-provider.tsx`

### Libraries

- `lib/actions.ts`
- `lib/arena-email-constants.ts`
- `lib/arena-email.ts`
- `lib/mock-api.ts`
- `lib/prisma.ts`
- `lib/sheet-actions.ts`
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
- `components/AddCompetitorModal.tsx`
- `components/AdsDashboard.tsx`
- `components/CompetitorsTable.tsx`
- `components/DashboardClient.tsx`
- `components/Sidebar.tsx`
- `components/Spinner.tsx`
- `components/arena-email-provider.tsx`
- `lib/actions.ts`
- `lib/arena-email-constants.ts`
- `lib/arena-email.ts`
- `lib/mock-api.ts`
- `lib/prisma.ts`
- `lib/sheet-actions.ts`
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

- **Updated at:** 2026-08-24T11:10:44.722Z
- **Request:** Fix ONLY the failing Vercel build by decoupling Prisma schema migration from the build step. The current build script runs `prisma generate && prisma db push && next build`. The `prisma db push` step keeps failing during Vercel deploys with `potential_dataloss` errors because the generated schema drifts from the live Neon database (it wants to drop columns/tables that still contain data). We do NOT want migrations to run during the build.

Required change (Option C — remove db push from build):

1. In package.json, change the `build` script from:

   "build": "prisma generate && prisma db push && next build"

   to:

   "build": "prisma generate && next build"

   (Remove the `prisma db push` segment only. Keep `prisma generate` and `next build`.)

2. If there is any other script (e.g. `vercel-build`, `postinstall`, or a prebuild hook) that also runs `prisma db push`, remove the `prisma db push` invocation from those build/deploy scripts too, so no schema push runs automatically during a Vercel deployment.

3. Do NOT add --accept-data-loss anywhere. Do NOT drop any columns or tables. Do NOT modify prisma/schema.prisma. Do NOT delete data.

Constraints:
- Touch ONLY package.json (and only the build/deploy script lines described above).
- Do not modify, refactor, remove, or reformat any dependency, other script, model, field, file, or code.
- Preserve all existing formatting, naming, comments, and logic everywhere else.
- Do not add features, optimizations, or unrelated changes.

After implementing, list exactly which file and lines were changed and why, and show the before/after of the build script.
