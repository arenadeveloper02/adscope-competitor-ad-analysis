# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T09:44:46.156Z.

## Overview

AdScope — Competitor Ad Analysis. This edit fixes the Add Extra Competitor modal contrast (opaque card, backdrop blur, higher z-index, high-contrast input), wires 'Get Ads for Selected' and 'Add Extra Competitor' to the dynamic ads-analysis workflow API with a serialized competitorDetails payload, persists workflow results to Postgres (new AdIntelligenceReport model), fetches the stored report back from the DB, and renders a full ad intelligence dashboard (KPI cards, competitor scorecards, 12-month activity heatmap, keyword battlefield, CTA arsenal, messaging themes, and strategic signal cards). Files changed: prisma/schema.prisma (added AdIntelligenceReport model only — AnalysisSession untouched), lib/types.ts (added dashboard DTOs + optional Competitor.description), lib/actions.ts (added runAdsWorkflow server action with dynamic payload, DB write/read, and dashboard builder; existing actions unchanged), components/AddCompetitorModal.tsx (contrast/z-index/backdrop fix only), components/DashboardClient.tsx (handleGetAds/handleAddCompetitor now call runAdsWorkflow and render the dashboard), components/AdsDashboard.tsx (new visualization component), app/not-found.tsx (canonical required file).

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 31

## Features

- Competitor discovery via Arena workflow API
- Dynamic Get Ads for Selected workflow execution with serialized competitorDetails
- Add Extra Competitor modal with fixed contrast, blur backdrop and auto workflow trigger
- Postgres-backed ad intelligence report storage and retrieval
- KPI summary cards (total ads, active %, image/video creatives, competitor count)
- Competitor scorecards with format mix bars, intensity score, headline pills and LIVE/PAUSED badges
- 12-month ad activity pulse heatmap
- Keyword battlefield pills and CTA arsenal frequency bars
- Messaging themes and strategic signal insight cards

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
- `components/AddCompetitorModal.tsx`
- `components/AdsDashboard.tsx`
- `components/CompetitorsTable.tsx`
- `components/DashboardClient.tsx`
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

- **Updated at:** 2026-08-24T09:44:46.156Z
- **Request:** Here is the prompt formatted in your requested structure, incorporating all dynamic API workflows, DB fetching, full dashboard visualizations, and the UI modal fix:

Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

Fix UI Contrast & Input Visibility for "Add Extra Competitor" Modal:

Resolve the overlay/transparency bug where the modal text and input field are obscured or unreadable against the table background.

Apply appropriate z-index, backdrop blurring, opaque background colors (e.g., #1A1A2E or solid dark theme), clear border styling, and high-contrast text styling for input placeholders and text fields.

Dynamic "Get Ads for Selected" Workflow API Call:

Replace hardcoded payload structures in the execution API call when the user clicks "Get Ads for Selected".

Endpoint: POST [https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute](https://agent.thearena.ai/api/workflows/cca441d4-12dc-4eb9-a211-8f7d6cbcde05/execute)

Headers:

X-API-Key: sk-sim-8bpk3K9bxQG90vzT8x-lVMAOPjjmIGls

Content-Type: application/json

Cookie: AWSALB=GlhtnFrSouMMjpwbb0VwXL4DHgJyVQ1LFwf9x6ljvivCYyDYBM6NiF591hfhrjxsFz1xEuYUfHd6P8RAbE5eccOksyQYhZtegtLd36S4jwmVoy6qajqidLSxRrxd; AWSALBCORS=GlhtnFrSouMMjpwbb0VwXL4DHgJyVQ1LFwf9x6ljvivCYyDYBM6NiF591hfhrjxsFz1xEuYUfHd6P8RAbE5eccOksyQYhZtegtLd36S4jwmVoy6qajqidLSxRrxd

Dynamic Body Payload: Filter the selected competitors from the UI state and serialize them dynamically into the stringified competitorDetails array along with companyName and Email:

JSON
{
  "companyName": "<ENTERED_COMPANY_DOMAIN>",
  "Email": "<USER_EMAIL>",
  "competitorDetails": "[{\"name\":\"<COMPETITOR_NAME>\",\"competitor_domain_url\":\"<COMPETITOR_DOMAIN>\",\"competitor_description\":\"<COMPETITOR_DESC>\"}]"
}
Dynamic "Add Extra Competitor" Analysis Workflow:

When a user manually inputs a new competitor domain in the "Add Extra Competitor" modal and submits:

Automatically append the new competitor to the list and trigger the workflow execution API with the newly added competitor details included in competitorDetails.

Postgres DB Fetching & Rich Dashboard Visuals Rendering:

Once the workflow execution completes, fetch the processed ad intelligence metrics from the Postgres DB and render the full interactive analytics dashboard below:

KPI Summary Cards: Total Ads Tracked, Active Ads (%), Image/Video Creatives, and Competitor count.

Competitor Scorecards: Individual competitor cards displaying total/active ad ratios, multi-color format mix progress bars (Image, Text, Video), market intensity score, headline word pills, and status badges (LIVE / PAUSED).

Ad Activity Pulse Heatmap: 12-month activity grid displaying monthly ad density per competitor using brand color opacities.

Keyword Battlefield & CTA Arsenal: Target keyword pills and CTA usage frequency horizontal progress bars.

Messaging Themes & Strategic Signals: Top recurring ad angles with frequency bars, alongside categorized insight cards (Opportunity, Trend, Alert, Watch).

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
