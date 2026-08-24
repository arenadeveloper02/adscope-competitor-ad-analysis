# Repository Summary: AdScope — Competitor Ad Analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-24T07:33:40.648Z.

## Overview

A modern single-page dashboard for competitor ad analysis: enter a domain, list competitors with match scores, select them, and fetch their ads (mock APIs with realistic loading states), styled with the Arena Design System.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 31

## Features

- Add Extra Competitor CTA with modal that auto-fetches ads for the new competitor and appends results
- Domain input with 'List Competitors' CTA and 1.5s mock API loading spinner
- Selectable competitors table (single, multiple, select-all) with match score badges
- 'Get Ads for Selected' button (disabled with no selection) rendering ads as a responsive card grid
- Careful loading-state management (isFetchingCompetitors / isFetchingAds) to prevent double clicks
- Graceful empty states for no competitors and no ads
- Arena email gate (middleware + access-denied page) and analysis logging to Postgres via Prisma

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Infrastructure

- **Neon project ID:** `morning-sound-27712377` — managed by Sim Development; do not delete or replace
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
- `.gitignore`
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
- `.gitignore`
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

- **Updated at:** 2026-08-24T07:33:40.648Z
- **Request:** System Role: You are an expert frontend developer with strong UI/UX design skills. Your task is to build a modern, responsive web application for competitor ad analysis. Please use clean code, state management, and modern styling (e.g., Tailwind CSS).

Application Requirements:

1. Core Layout & Navigation

Create a clean, single-page dashboard layout.

At the very top of the page, add a primary CTA button: "Add Extra Competitor".

Behavior: Clicking this should open a small modal or inline input field where the user can manually enter a competitor's domain. Upon submission, it should automatically trigger the analysis/ad-fetching API for that specific new competitor and append the results to the existing data.

2. Domain Input Section

Create an input form with a text field labeled "Enter Domain URL".

Next to or below the input, add a CTA button: "List Competitors".

Behavior: Clicking this button triggers a mock API call (fetchCompetitors(domain)). Show a loading spinner during the request.

3. Competitors Table Section

Once the competitors are fetched, display them in a well-structured data table.

Columns needed: Checkbox (for selection), Competitor Name, Competitor Domain, and Match Score/Relevance (mock data).

Behavior: The user must be able to select one, multiple, or all competitors using the checkboxes.

4. Ad Analysis Section

At the bottom of the competitors table, add a CTA button: "Get Ads for Selected".

Behavior: This button should be disabled if no competitors are selected in the table. When clicked, it triggers a second mock API call (fetchCompetitorAds(selectedCompetitorIds)). Show a loading state while fetching.

Results Display: Once the response returns, render the ads data clearly below the button. Format this as a grid of cards or an accordion list, showing the Competitor Name, Ad Headline, Ad Copy, and Ad Platform.

5. Technical & State Management Rules

Please mock all API calls using setTimeout (e.g., 1.5 seconds delay) and return dummy JSON data so the UI can be tested immediately.

Manage the loading states (isFetchingCompetitors, isFetchingAds) carefully to prevent double-clicks.

Ensure the application handles empty states gracefully (e.g., "No competitors found" or "No ads available").

Output format: Please provide the complete, runnable code for this application.
