# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T08:06:46.954Z.

## Overview

AdScope — Competitor Ad Analysis. Edit: replaced the mock competitor search with a real server-side POST to the Arena workflow API (new searchCompetitors server action in lib/actions.ts), added CompetitorSearchResult type in lib/types.ts, and updated components/DashboardClient.tsx handleListCompetitors to call the API with loading state and friendly error display. Manual competitor add, checkbox selection, and mock ad fetching are preserved untouched. prisma/schema.prisma echoed unchanged.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 30

## Features

- Real API competitor search via Arena workflow endpoint (server action, dynamic company_domain_url payload)
- Robust response parsing with match-score fallback when the API omits scores
- Loading indicators and friendly error messages for failed or empty API results
- Manual 'Add Extra Competitor' modal flow preserved
- Checkbox single/multi/select-all competitor selection preserved
- 'Get Ads for Selected' mock ad analysis and ad cards preserved
- Analysis session logging to Neon Postgres via Prisma

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

- **Updated at:** 2026-08-24T08:06:46.954Z
- **Request:** Implement the following functionality in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

Changes to implement:

API Integration for Competitor Search: Replace the mock fetchCompetitors function with an actual HTTP POST request to the following API endpoint when the user submits a domain URL:

Endpoint: [https://agent.thearena.ai/api/workflows/a5a9fda5-1a2d-4c60-b818-82897efae436/execute](https://agent.thearena.ai/api/workflows/a5a9fda5-1a2d-4c60-b818-82897efae436/execute)

Method: POST

Headers:

X-API-Key: sk-sim-vTPTbbRj94Pf9YjOyjNthKyXig5NLD1F

Content-Type: application/json

Cookie: AWSALB=0pW9//ob33hd6Jof2VVkLLwdUtYN1S9n26EosfsQO/Oamm/3cvT7oYM/lNmjMQEW8AMMSrni2GEDsGNsw+AlBU7SogaKDwLqJFp1XL1qR2/rgI00jyQsTU2ft499; AWSALBCORS=0pW9//ob33hd6Jof2VVkLLwdUtYN1S9n26EosfsQO/Oamm/3cvT7oYM/lNmjMQEW8AMMSrni2GEDsGNsw+AlBU7SogaKDwLqJFp1XL1qR2/rgI00jyQsTU2ft499

Dynamic Request Body: Pass the user-entered domain URL dynamically into the payload body in the format: {"company_domain_url": "<domain_input>"}.

Response Parsing & Table Rendering: Parse the array/data returned by the API response and map it to populate the Competitors Table with fields for Selection Checkbox, Competitor Name, Competitor Domain, and Match Score/Relevance (fall back to a calculated/mock score if omitted by the API).

State & Error Handling: Ensure proper loading state indicators (isFetchingCompetitors) while the API call is in progress, along with error handling to display friendly messages if the API request fails or returns an empty result set.

Preserve Surrounding Workflows: Maintain the full capability for:

"Add Extra Competitor" CTA/Modal: Allowing manual competitor additions and appending them to the table.

Competitor Selection: Checkbox state management allowing single, multiple, or select-all options.

Ad Analysis Trigger: The "Get Ads for Selected" button logic triggering the mock fetchCompetitorAds call and rendering ad cards below.

Constraints:

Only touch the files/functions directly related to the points above.

Do not change variable names, code style, or structure outside the scope of these changes.

Do not add extra features, optimizations, or refactors that weren't requested.

If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.

After implementing, list exactly which files and lines were changed, and why.
