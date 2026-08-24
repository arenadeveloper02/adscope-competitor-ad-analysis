# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T10:39:52.583Z.

## Overview

AdScope — Competitor Ad Analysis. Changes: components/Sidebar.tsx (NEW fixed left nav with logo/title, 5 nav items, dynamic company + selected competitors, Sync & Sheet footer actions); components/DashboardClient.tsx (renders sidebar, section anchors, sync/sheet handlers, modal-triggered re-analysis rebuilds dashboard); components/AdsDashboard.tsx (self-company scorecard rendered first with YOU badge, dynamic 7-day/30-day/monthly heatmap labels, section ids); components/AddCompetitorModal.tsx (dimmed overlay polish, button renamed Analyze); lib/actions.ts (fixed toCompetitor domain mapping to use per-competitor landing_page_url/domain instead of the searched company_domain_url, added date parsing + dynamic heatmap bucketing, self-first dashboard build, new exportDashboardToSheet action persisting exports to Postgres); lib/types.ts (additive isSelf/heatmapLabels fields); prisma/schema.prisma (additive SheetExport model, AnalysisSession untouched).

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 32

## Features

- Fixed left navigation sidebar with Insights/Overview/Ad Gallery/Competitors/Creative Analysis
- Dynamic company + selected competitors display in sidebar
- Sync and Sheet (spreadsheet storage export) footer actions
- Self-company shown first in scorecards
- Add Extra Competitor modal triggers workflow and rebuilds dashboard
- Per-competitor domain fix in competitors table data
- Dynamic 7-day / 30-day / monthly Ad Activity Pulse heatmap

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

- **Updated at:** 2026-08-24T10:39:52.583Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Left Navigation Sidebar:

Add a fixed left navigation sidebar matching the design layout with the following sections:

Header: Logo, application title ("Ad Intelligence"), and subtitle ("Competitor Tracker").

Navigation Items:

Insights (Market intelligence)

Overview (Charts & summary)

Ad Gallery (Browse all creatives)

Competitors (Deep competitor intel)

Creative Analysis (Keywords & messaging)

Dynamic Selected State: Display the main target Company Name and a dynamic list of Selected Competitors underneath the navigation links.

Footer Action Buttons: Add two action buttons at the bottom of the sidebar:

Sync: Triggers a sync/refresh of the current dataset.

Sheet: Exports and syncs the current dashboard data directly to Google Sheets / spreadsheet storage.

Self-Company Priority Display ("Self" First in Visuals & Scorecards):

Update the scorecard and metric grid rendering logic to ensure the primary target company (where competitor_name matches the searched domain or is_self is true) is displayed first (as shown in the scorecards layout), followed by the selected competitors.

"Add Extra Competitor" Modal UI & Analysis Trigger:

Fix the modal overlay so that when "Add Extra Competitor" is clicked:

The modal pops up over a dimmed background with clean styling and input fields.

When the user inputs a domain and clicks "Analyze", trigger the AI workflow execution API for the new competitor, query the updated results from the Postgres DB, and rebuild/re-render the entire dashboard automatically.

Fix Competitor Domain Display Column in Competitors Table:

Fix the bug in the Competitors Table where the COMPETITOR DOMAIN column displays the main searched domain (betabionics.com) for all rows.

Update the table mapping so that COMPETITOR DOMAIN displays each competitor's actual domain (e.g., medtronic-diabetes.com for Medtronic Diabetes) extracted from the competitor payload's landing_page_url / domain field.

Dynamic Date Range for "Ad Activity Pulse" Heatmap:

Modify the "Ad Activity Pulse" section to dynamically render the heatmap grid based on the date range of the fetched ad data:

Display a 7-day range view if data covers 7 days.

Display a 30-day range view if data covers 30 days.

Display a monthly range view (e.g., 5 months) if data spans multiple months.

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
