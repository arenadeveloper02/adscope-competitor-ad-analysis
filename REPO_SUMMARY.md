# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T12:46:51.857Z.

## Overview

AdScope — Competitor Ad Analysis. This edit adds a complete Creative Analysis tab (KPI + donut metric cards, dynamic top keywords, messaging tag cloud, headline openers, per-competitor headlines), a reworked Ad Gallery with a working multi-filter bar and richer ad cards, Back / Clear-and-search-new-company navigation, cancellable Sync and Sheet header actions, server-side session persistence (DashboardSnapshot table keyed by Arena emailId — no localStorage), and hover tooltips across all visualizations.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 38

## Features

- Creative Analysis tab with 4 KPI cards and 4 donut metric cards (Image/Video/CTA/Keyword coverage) with Filter gallery links
- Top keywords overall + per-competitor bars that update dynamically with competitor/format filters
- Messaging language tag cloud, headline opener pattern cards, and numbered top unique headlines per competitor
- Ad Gallery filter bar: competitor pills, format pills, and live search (single search input, redundant one removed)
- Richer ad cards: Live status badge, format badge, brand pill, timestamp, headline, copy, destination link
- Cancellable Sync and Sheet export actions with clear status feedback in TopNav
- Back navigation to the domain input plus Clear / Search Other Company reset action
- Server-side state persistence via DashboardSnapshot (survives browser refresh, keyed by emailId)
- Hover tooltips on donuts, bars, progress bars, ad share bars, and heatmap cells

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

- **Updated at:** 2026-08-24T12:46:51.857Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Creative Analysis Tab Complete Build (Images 1, 2, 3, 4, 10):

Implement the complete Creative Analysis view containing:

KPI & Donut Metrics Grid: 4 top summary cards followed by 4 percentage donut chart cards (Have Image Creative, Have Video Creative, Have Clear CTA, Have Keyword Data) with interactive "Filter gallery →" action links.

Top Keywords Section: Overall keyword horizontal bar charts and individual per-competitor keyword volume breakdowns.

Dynamic Keyword Filtering: Ensure the displayed keywords update dynamically whenever competitor or creative format filters are modified.

Messaging Language & Headline Openers: A colorful tag cloud for messaging keywords, a grid of common headline opener pattern cards, and numbered lists of top unique headlines per competitor.

Navigation "Back" Option & Search UI Cleanup:

Add a clear "Back" button / navigation control across all sub-views and dashboard sections to allow users to navigate back to the domain input screen.

Remove redundant or misaligned search bars from component headers (such as inside the Ad Gallery summary section).

Sync & Sheet Header Actions with Cancel Controls (Image 5):

Update the top right Sync and Sheet header buttons:

Provide an interactive loading/cancellation mechanism for Sync (e.g., allow cancelling an in-progress sync request).

Add clear status feedback and cancellation options for Sheet data exports.

State Persistence & "Clear / Search New Company" Option (Image 6):

Implement state persistence (via localStorage or session state) so browser refreshes do not wipe out the searched domain, selected competitors, or fetched analysis metrics.

Add an explicit "Clear" / "Search Other Company" CTA button on the UI to allow users to reset the state and analyze a new domain on demand.

Interactive Hover Tooltips on Visuals:

Add hover tooltips across all visual elements (donut charts, horizontal bar charts, progress bars, ad share bars, and heatmaps) to display precise values, percentages, and metadata on hover.

Ad Gallery Grid Layout & Multi-Filter Controls (Images 8 & 9):

Gallery Cards (Image 8): Render ad creative cards in a grid displaying status badge (Live), format badge (image, text, video), brand pill, timestamp, headline, body text snippet, and destination link.

Working Filter Bar (Image 9): Implement a fully functional filter bar at the top of the Ad Gallery containing:

Competitor filter pills (All, and individual competitor buttons).

Creative format filter pills (All, Image, Text, Video).

Live search input box ("Search headlines, CTAs, keywords...") that filters displayed cards in real time.

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
