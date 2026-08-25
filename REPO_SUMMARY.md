# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T15:34:35.175Z.

## Overview

Competitor ad analysis dashboard: discover competitors for any domain, trigger the Competitor Intelligence workflows, and analyze fetched ads across platforms with insights, gallery, intel, and creative analysis views.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 39

## Features

- Domain-based competitor discovery via Arena workflow
- Two-step ads analysis flow (trigger Final workflow, then fetch Get workflow results)
- Market insights dashboard with KPI cards, scorecards, heatmap, keywords, CTAs, themes, and signals
- Ad gallery with search and format filters
- Competitor intel deep-dive per competitor
- Creative analysis breakdowns
- Server-side dashboard snapshot persistence keyed by Arena emailId
- Analysis session logging and sheet export storage in Postgres

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
- `lib/dashboard-actions.ts`
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
- `lib/dashboard-actions.ts`
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

- **Updated at:** 2026-08-25T15:34:35.175Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

PROBLEM TO FIX:
After clicking "Get Ads for Selected", the dashboard shows "No ads data was found yet for this analysis. Please try again in a moment." The root cause is a two-step API flow that is not correctly sequenced. Fix handleGetAdsForSelected so it correctly chains BOTH APIs with the exact key names each one expects.

CHANGES TO IMPLEMENT:

1. Correct the two-step API flow inside handleGetAdsForSelected (in the main component where the "Get Ads for Selected" button lives):

STEP 1 — Trigger the Competitor Intelligence Agent Final workflow (this generates ad data and writes it to the DB; it is long-running, ~4+ minutes).
  - Endpoint: POST https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute
  - Headers: 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls'
  - Payload keys MUST be exactly: companyName, Email, competitorDetails (where competitorDetails is JSON.stringify() of the mapped competitor array with keys name, competitor_domain_url, competitor_description).
  - Await this call fully. Only proceed to Step 2 after this response returns success (response.ok / data.success === true). Because it takes minutes, keep isFetchingAds = true for the entire duration so the button stays disabled and a loading state is shown.

STEP 2 — Fetch the dashboard result from the Competitor Intelligence Agent Get workflow (this reads the finished analysis from the DB):
  - Endpoint: POST https://agent.thearena.ai/api/workflows/44a45367-2ae0-406f-b745-6b2e2bef52fe/execute
  - Headers: 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-'
  - Payload keys MUST be exactly (lowercase / snake_case — DO NOT reuse the Step 1 payload object): { "email": userEmail, "company_name": companyDomain }
  - Parse the response and populate the dashboard state (KPI cards, ad cards grid, insights, creative analysis) from this Get response.

EXACT LOGIC TO USE:

const handleGetAdsForSelected = async () => {
  if (!selectedCompetitors || selectedCompetitors.length === 0) return;

  setIsFetchingAds(true);
  try {
    // 1. Map to exact API schema for the Final (trigger) workflow
    const formattedCompetitors = selectedCompetitors.map((comp) => ({
      name: comp.competitorName || comp.name,
      competitor_domain_url: comp.competitorDomain || comp.domain,
      competitor_description: comp.description || `Competitor to ${companyDomain}`
    }));

    const triggerPayload = {
      companyName: companyDomain,
      Email: userEmail,
      competitorDetails: JSON.stringify(formattedCompetitors)
    };

    // STEP 1: Trigger the long-running Final workflow and WAIT for it to finish
    const triggerResponse = await fetch('https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls',
      },
      body: JSON.stringify(triggerPayload)
    });

    if (!triggerResponse.ok) throw new Error(`Trigger API Error: ${triggerResponse.status}`);
    const triggerData = await triggerResponse.json();
    if (!triggerData || triggerData.success !== true) throw new Error('Trigger workflow did not complete successfully');

    // STEP 2: Fetch the dashboard result from the Get workflow (DIFFERENT payload keys)
    const getPayload = {
      email: userEmail,
      company_name: companyDomain
    };

    const getResponse = await fetch('https://agent.thearena.ai/api/workflows/44a45367-2ae0-406f-b745-6b2e2bef52fe/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-',
      },
      body: JSON.stringify(getPayload)
    });

    if (!getResponse.ok) throw new Error(`Get API Error: ${getResponse.status}`);
    const dashboardData = await getResponse.json();

    // 3. Populate dashboard state from dashboardData (KPI cards, ad cards, insights, creative analysis)
    //    and reveal the navigation tabs + dashboard sections; hide the initial input + competitor table.

  } catch (error) {
    console.error('Error running ad analysis flow:', error);
  } finally {
    setIsFetchingAds(false);
  }
};

2. Do NOT reuse the Step 1 payload object for Step 2. The Final workflow uses { companyName, Email, competitorDetails } and the Get workflow uses { email, company_name }. Using the wrong keys is what returns empty data.

3. Since Step 1 is long-running, ensure the loading/disabled state (isFetchingAds) remains true across BOTH calls, and only the successful Get response reveals the dashboard. If the Get response contains no ads, keep the existing "No ads data was found yet" message.

4. Bind handleGetAdsForSelected to the button onClick. Keep the button disabled when isFetchingAds is true or selectedCompetitors.length === 0.

CONSTRAINTS:
- Only touch the files/functions directly related to the points above.
- Do not change variable names, code style, or structure outside the scope of these changes.
- Do not add extra features, optimizations, or refactors that weren't requested.
- If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
- After implementing, list exactly which files and lines were changed, and why.
