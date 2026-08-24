# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T16:28:17.948Z.

## Overview

AdScope — Competitor Ad Analysis. Edit: the top-header Active Competitors dropdown checkboxes now update the selected competitors state (selectedIds) and any change immediately re-displays the competitor selection table with the 'Get Ads for Selected' button so the workflow can be re-triggered with the modified selection. Files changed: components/DashboardClient.tsx (handleToggleCompetitorActive now toggles selectedIds and sets isPickingMore(true); TopNav now receives activeCompetitorIds={selectedIds}); prisma/schema.prisma echoed unchanged (additive-safe). TopNav already had checkbox rows, conditional dropdown/tab visibility, and no Sync/Sheet buttons; AdGallery search already applies left padding; AdsDashboard Active Ads KPI already shows the absolute count — those files were left untouched.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 38

## Features

- Competitor discovery for any domain via workflow API
- Competitor selection table with Get Ads workflow trigger
- Header competitor dropdown with checkboxes that update selection and reveal the Get Ads section
- Conditional visibility: setup view before analysis, tabbed dashboard after ads fetch
- Insights, Ad Gallery, Competitor Intel, and Creative Analysis tabs
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

- **Updated at:** 2026-08-24T16:28:17.948Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Competitor Management Dropdown UI (Checkboxes):

Update the "Active Competitors" dropdown menu in the top header. Replace the 'X' (remove) icon next to each competitor with a standard Checkbox.

Behavior: Modifying these checkboxes updates the selected competitors state.

Crucial Visibility Trigger: If the user makes any changes within this dropdown (checking or unchecking a competitor), the "Get Ads for Selected" button/section must immediately become visible again so the user can re-trigger the API workflow with the newly modified selection.

Conditional Visibility of Competitor Dropdown:

Hide the "Active Competitors" dropdown list (and its parent trigger button/icon in the top header) on the initial load.

This dropdown must only become visible after the user completes the initial setup phase (i.e., after they select competitors from the main table and click "Get Ads for Selected", and the dashboard data successfully loads).

Top Header & Navigation Restructuring:

Restructure the top header to only include the logo/title block on the left and the "+ Add Competitor" action button (and the dropdown, once visible) on the right.

Completely remove the "Sync" and "Sheet" buttons from the application.

Move the main navigation tabs (Insights, Ad Gallery, Competitors, Creative Analysis) out of the top header and place them in a secondary navigation bar positioned directly below the top header.

Conditional Visibility of Navigation & Dashboard:

Hide the main navigation tabs and all corresponding dashboard sections on initial load. They must only become visible after the user successfully fetches data by clicking "Get Ads for Selected".

Toggle Initial Input & Competitor Table Views:

Once the dashboard data loads and becomes visible, hide/unmount the initial "Analyze a Domain" input block and the "Competitors" selection table.

Add Competitor Flow: When the user clicks the top header's "+ Add Competitor" button, add the new competitor to the state and re-display the Competitors selection table so the user can select them. The "Get Ads for Selected" button must also be visible during this state.

Search Bar CSS Fix & Cleanup:

Fix the CSS layout bug in the Ad Gallery search bar where the magnifying glass icon overlaps with the placeholder text (apply pl-10 or similar padding).

Completely remove any "Back" navigation buttons, "Clear" buttons, and "Search Other Company" reset buttons from the UI.

Active Ads KPI Formatting:

Update the metric displayed on the "Active Ads" KPI summary card to display the absolute number of active ads (e.g., 32) instead of a percentage value.

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
