# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T11:32:30.968Z.

## Overview

Competitor ad intelligence dashboard: discover competitors for any domain, fetch and analyze their ads, and explore insights, ad gallery, competitor intel, and creative analysis tabs.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 38

## Features

- Domain-based competitor discovery
- Ads workflow analysis with market insights dashboard
- Ad gallery with summary KPIs and search/format filters
- Creative analysis with keyword drill-down and messaging tags
- Server-side session snapshots keyed by Arena emailId

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
- `DashboardSnapshot`

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
- `lib/mock-api.ts`
- `lib/prisma.ts`
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
- `lib/mock-api.ts`
- `lib/prisma.ts`
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

- **Updated at:** 2026-08-25T11:32:30.968Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Insights Tab Layout Update:

Insert the "Keyword Battlefield" (tag cloud of top search terms) and "CTA Arsenal" (horizontal bar chart of most-used calls-to-action) components directly above the existing "Messaging Themes" and "Strategic Signals" visuals in the Insights tab.

Ad Gallery Tab Layout Update:

Insert the Ad Gallery Summary Dashboard directly above the main ad cards grid. This summary section must include:

The 4 top KPI cards (Total Ads Tracked, Active Ads, Image Creatives, Competitors).

The secondary metrics row containing the Activity donut/progress, Creative Mix horizontal bars, Top CTA summary, and Timeline bar.

The Competitor Ad Share horizontal stacked progress bar.

Fix Search Box Overlap (CSS):

Fix the visual bug in the Ad Gallery's search input where the magnifying glass icon overlaps with the placeholder text ("Search headlines, copy, CTAs...").

Apply appropriate left padding (e.g., pl-10 or pl-12) to the <input> element so the text starts to the right of the absolutely positioned search icon.

Creative Analysis Tab Complete Layout:

Structure the Creative Analysis tab to display the following components in this exact top-to-bottom order:

Summary Donut Cards: A grid of 4 metric cards (Have Image Creative, Have Video Creative, Have Clear CTA, Have Keyword Data) with percentage rings.

Keyword Drill-down: The "Top Keywords — All Competitors" horizontal stacked bar chart, followed by a three-column grid displaying individual keyword search volumes per competitor.

Messaging & Openers: The "Messaging Language" colorful tag cloud, followed by the "Common Headline Openers" grid showing recurring phrases and their ad counts.

Unique Headlines: A multi-column layout listing the top 10 unique headlines used by each respective competitor.

Fix "Add Competitor" Modal Transparency (CSS):

Fix the visual bug where the "Add Competitor" modal is transparent and its contents overlap with the underlying background (e.g., the Ad Gallery grid).

Apply a solid background color class (e.g., bg-white or bg-slate-800 depending on the active theme) to the modal's main container <div>.

Ensure the modal has a high z-index (e.g., z-50), a drop shadow (shadow-xl), and proper relative/absolute positioning so it sits opaquely over the dimmed backdrop. Do not alter the modal's Javascript functionality or state.

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
