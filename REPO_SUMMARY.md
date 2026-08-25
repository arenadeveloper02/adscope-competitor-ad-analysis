# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T16:34:50.073Z.

## Overview

AdScope discovers competitors for any domain and analyzes their ads across platforms with a two-step trigger + poll workflow, DB-backed session persistence, and an Arena DS dashboard.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 40

## Features

- Competitor discovery by domain via Arena workflow
- Two-step ads analysis: fire-and-forget trigger + resilient polling of the Get workflow
- Market Insights dashboard with KPI cards, scorecards, heatmap, keywords, CTAs, themes, and signals
- Ad Gallery with search and format filters
- Competitor Intel and Creative Analysis tabs
- Server-side session snapshot persistence keyed by Arena emailId
- Analysis session logging and sheet export to Postgres

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

- **Updated at:** 2026-08-25T16:34:50.073Z
- **Request:** Fix the "No ads data was found yet for this analysis" bug. The backend data DOES exist — the Get workflow returns a large valid ads/dashboard payload when called with { email, company_name }. The real problem is that the front-end two-step flow is not resilient to the long-running trigger workflow, so the Get call is never reached or its result is never rendered. Implement the fixes below ONLY. Do not modify, refactor, remove, or "clean up" any other part of the code. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

=====================================================
ROOT CAUSE
=====================================================
- The Final (trigger) workflow at cca441d4-12dc-4eb9-a211-8f7d6cbcde05 takes ~4+ minutes. A single blocking browser fetch to it is cut off by gateway/ALB/browser timeouts, throws, and the catch block runs BEFORE Step 2 (the Get call) ever executes. So the dashboard never gets populated.
- Fix by DECOUPLING the two calls and POLLING the Get endpoint until data appears.

=====================================================
FIX 1 — handleGetAdsForSelected: trigger + poll pattern
=====================================================
Rewrite handleGetAdsForSelected (in the main component) to:

STEP 1 (fire the trigger, tolerate timeout): POST to the Final workflow but DO NOT block the UI on its full completion. Wrap it so a network timeout/abort does NOT abort the whole flow.
  - Endpoint: POST https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute
  - Headers: 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls'
  - Body keys EXACTLY: companyName, Email, competitorDetails (competitorDetails = JSON.stringify of mapped array with keys name, competitor_domain_url, competitor_description).
  - Fire it and catch/ignore its timeout (the workflow keeps running server-side even if the fetch is dropped).

STEP 2 (poll the Get endpoint until data appears): Repeatedly call the Get workflow every 20 seconds (up to ~15 attempts / 5 minutes) until it returns ads data, then render the dashboard.
  - Endpoint: POST https://agent.thearena.ai/api/workflows/44a45367-2ae0-406f-b745-6b2e2bef52fe/execute
  - Headers: 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-'
  - Body keys EXACTLY (lowercase/snake_case — do NOT reuse the Step 1 payload): { email: userEmail, company_name: companyDomain }
  - On each poll: parse response JSON, detect whether it contains ads/dashboard data (non-empty). If yes: populate ALL dashboard state (KPI cards, ad cards grid, Insights, Creative Analysis), reveal the tabs, clear the "No ads data" message, stop polling, set isFetchingAds=false. If still empty: wait 20s and retry. Keep isFetchingAds=true and show a "Analyzing… this can take a few minutes" loading state during polling.
  - After max attempts with still no data, stop and show the existing "No ads data was found yet" message.

IMPORTANT PARSING NOTE: The Get response is large and may be nested (e.g. under output/result). Robustly locate the ads array/dashboard object in the response and guard against undefined so a valid-but-nested payload is NOT treated as empty. Only treat it as empty when there is genuinely no ads data.

Exact structure to use:

const handleGetAdsForSelected = async () => {
  if (!selectedCompetitors || selectedCompetitors.length === 0) return;
  setIsFetchingAds(true);
  try {
    const formattedCompetitors = selectedCompetitors.map((comp) => ({
      name: comp.competitorName || comp.name,
      competitor_domain_url: comp.competitorDomain || comp.domain,
      competitor_description: comp.description || `Competitor to ${companyDomain}`
    }));
    const triggerPayload = { companyName: companyDomain, Email: userEmail, competitorDetails: JSON.stringify(formattedCompetitors) };
    // STEP 1: fire trigger, tolerate timeout (server keeps running)
    fetch('https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls' }, body: JSON.stringify(triggerPayload)
    }).catch((e) => console.warn('trigger fetch dropped (workflow continues server-side):', e));
    // persist for refresh restore
    try { localStorage.setItem('adscope_companyDomain', companyDomain); localStorage.setItem('adscope_userEmail', userEmail); } catch {}
    // STEP 2: poll Get until data appears
    const maxAttempts = 15; const intervalMs = 20000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const getRes = await fetch('https://agent.thearena.ai/api/workflows/44a45367-2ae0-406f-b745-6b2e2bef52fe/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-' }, body: JSON.stringify({ email: userEmail, company_name: companyDomain })
      });
      if (getRes.ok) {
        const data = await getRes.json();
        const ads = extractAdsFromGetResponse(data); // robustly dig into output/result for the ads array/dashboard
        if (ads && ((Array.isArray(ads) && ads.length > 0) || (typeof ads === 'object' && Object.keys(ads).length > 0))) {
          populateDashboardFromGet(data); // set KPI cards, ad cards, insights, creative analysis; reveal tabs
          try { localStorage.setItem('adscope_lastDashboard', JSON.stringify(data)); } catch {}
          setIsFetchingAds(false);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    // exhausted attempts: keep existing empty-state message
  } catch (error) {
    console.error('Error running ad analysis flow:', error);
  } finally {
    setIsFetchingAds(false);
  }
};

Add the two small helpers extractAdsFromGetResponse(data) and populateDashboardFromGet(data) if they do not already exist, matching how the dashboard state is currently set. Reuse existing state setters — do not invent new dashboard rendering.

=====================================================
FIX 2 — restore on refresh (keep existing behavior, just ensure it renders)
=====================================================
Keep the on-mount useEffect that reads adscope_userEmail + adscope_companyDomain from localStorage, instantly paints from adscope_lastDashboard if present, then re-fetches the Get endpoint once with { email, company_name } and repopulates via populateDashboardFromGet. If nothing stored / empty response, fall back to the initial screen without error.

=====================================================
CONSTRAINTS
=====================================================
- Only touch handleGetAdsForSelected, the restore useEffect, and the two small helper functions.
- Do not change variable names, code style, or structure elsewhere.
- Do not add extra features/refactors.
- After implementing, list exactly which files and lines were changed, and why.
