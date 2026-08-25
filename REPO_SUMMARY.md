# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T08:24:25.264Z.

## Overview

Competitor ad intelligence dashboard: discover competitors for any domain, run the ads workflow for the selected set, and analyze creatives, CTAs, and messaging themes.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 38

## Features

- Domain-based competitor discovery via Arena workflow
- Get Ads for Selected workflow trigger with exact API payload schema
- Market insights dashboard with KPIs, scorecards, and activity heatmap
- Ad gallery with search and format filters
- Competitor intel and creative analysis tabs
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

- **Updated at:** 2026-08-25T08:24:25.264Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Implement handleGetAdsForSelected API Function:

Inside the main component (where the "Get Ads for Selected" button lives), implement the exact API execution logic provided below.

Crucial Payload Requirement: You must map the selected competitors from the UI state to match the exact keys expected by the API (name, competitor_domain_url, competitor_description).

Stringify Requirement: You must JSON.stringify() the competitorDetails array before adding it to the main payload, as the API expects this specific field to be a stringified array, not a native JSON array.

Integrate the exact Code Snippet:

Use the following logic for the API call:

const handleGetAdsForSelected = async () => {
  if (!selectedCompetitors || selectedCompetitors.length === 0) return;

  setIsFetchingAds(true);
  try {
    // 1. Map to exact API schema
    const formattedCompetitors = selectedCompetitors.map((comp) => ({
      name: comp.competitorName || comp.name, 
      competitor_domain_url: comp.competitorDomain || comp.domain, 
      competitor_description: comp.description || `Competitor to ${companyDomain}`
    }));

    // 2. Construct payload with double-stringified array
    const payload = {
      companyName: companyDomain,
      Email: userEmail,
      competitorDetails: JSON.stringify(formattedCompetitors)
    };

    // 3. Execute POST request
    const response = await fetch('https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();

    // 4. Proceed to fetch Dashboard Data from DB here

  } catch (error) {
    console.error("Error triggering ad workflow:", error);
  } finally {
    setIsFetchingAds(false);
  }
};

Button Visibility & Disabled State:

Bind this function to the onClick event of the "Get Ads for Selected" button.

Ensure the button is disabled when isFetchingAds is true, or when selectedCompetitors.length === 0.

Ensure this button/section immediately becomes visible and active if the user makes any changes to their competitor selection (either via the main table checkboxes or the active competitors dropdown in the top header).

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
