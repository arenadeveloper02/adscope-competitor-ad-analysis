# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T15:52:14.315Z.

## Overview

AdScope — Competitor Ad Analysis. Edit: added a competitor management dropdown (with per-competitor Remove action) to the top header next to + Add Competitor (components/TopNav.tsx); wired remove logic in components/DashboardClient.tsx so removing a competitor updates state, filters ads, and recomputes dashboard KPIs/scorecards/heatmap; removed Sync/Sheet buttons and their props from components/Sidebar.tsx; kept the Ad Gallery search input left-padding fix in components/AdGallery.tsx; Active Ads KPI already shows the absolute count in AdsDashboard.tsx (unchanged); no Back/Clear/Search-Other-Company buttons exist in the rendered UI. prisma/schema.prisma is echoed unchanged (additive-safe).

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 38

## Features

- Competitor discovery by domain via Arena workflow
- Competitor selection table with Get Ads for Selected
- Ads dashboard with KPIs, scorecards, heatmap, themes, and signals
- Ad Gallery with competitor/format/search filters
- Competitor Intel and Creative Analysis tabs
- Top-header competitor dropdown with remove action
- Add Competitor modal that re-opens the selection table
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

- **Updated at:** 2026-08-24T15:52:14.315Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Top Header & Navigation Restructuring:

Restructure the top header to only include the logo/title block on the left and the "+ Add Competitor" action button on the right.

Completely remove the "Sync" and "Sheet" buttons from the application.

Move the main navigation tabs (Insights, Ad Gallery, Competitors, Creative Analysis) out of the top header and place them in a secondary navigation bar positioned directly below the top header.

Competitor Management Dropdown (Top Header):

In the top header, adjacent to or integrated with the "+ Add Competitor" section, add a dropdown menu that displays the current list of active/analyzed competitors.

Add a "Remove" action (e.g., an 'X' or trash icon) next to each competitor in this dropdown, allowing the user to easily delete a competitor from the current analysis view.

Ensure that adding a new competitor (via "+ Add Competitor") or removing one from this dropdown updates the application state and re-renders the dashboard visuals accordingly.

Conditional Visibility of Navigation & Dashboard:

Hide the main navigation tabs (Insights, Ad Gallery, Competitors, Creative Analysis) and all corresponding dashboard sections on initial load.

These tabs and sections must only become visible after the user successfully fetches data by clicking the "Get Ads for Selected" button.

Toggle Initial Input & Competitor Table Views:

Once the dashboard data loads and becomes visible, hide/unmount the initial "Analyze a Domain" input block and the "Competitors" selection table.

Add Competitor Flow: When the user clicks the top header's "+ Add Competitor" button, add the new competitor to the state and re-display the Competitors selection table so the user can select them. The "Get Ads for Selected" button must also be visible during this state to allow the user to trigger a fresh analysis.

Search Bar CSS Fix (Ad Gallery):

Fix the CSS layout bug in the Ad Gallery search bar where the magnifying glass icon overlaps with the placeholder text ("Search headlines, CTAs, keywords...").

Apply proper left padding (e.g., pl-10) to the input element and adjust the absolute positioning of the icon to maintain a clean gap.

Remove "Back" and "Clear" Actions:

Completely remove any "Back" navigation buttons from all dashboard views.

Completely remove the "Clear" and "Search Other Company" reset buttons from the UI.

Active Ads KPI Formatting:

Update the metric displayed on the "Active Ads" KPI summary card. It must display the absolute number of active ads (e.g., 32) instead of a percentage value (e.g., 100%).

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
