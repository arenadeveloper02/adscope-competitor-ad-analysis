# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T17:36:32.885Z.

## Overview

Competitor ad analysis dashboard: discover competitors for any domain, trigger the ads intelligence workflow, and explore market insights, ad gallery, competitor intel, and creative analysis.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 40

## Features

- Domain-based competitor discovery via Arena workflow
- Two-step trigger + poll ads analysis flow
- Market Insights dashboard with KPIs, scorecards, heatmap
- Ad Gallery with search, format filters, and clickable ad destinations
- Fully dynamic Creative Analysis computed from live ads data
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

- **Updated at:** 2026-08-25T17:36:32.885Z
- **Request:** Implement the following changes. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

=====================================================
1. CREATIVE INSIGHTS / CREATIVE ANALYSIS VISUALS — MAKE FULLY DYNAMIC
=====================================================
The Creative Analysis tab visuals must all be driven by the REAL data returned from the Get workflow response (the ads/dashboard payload), not any hardcoded/mock/placeholder values. Make these four visual groups fully dynamic and computed from the actual ads dataset for the selected competitors:

  (image 1) The 4 summary DONUT cards at the top — "Have Image Creative", "Have Video Creative", "Have Clear CTA", "Have Keyword Data". Each percentage ring and its "X of N ads" subtitle must be computed from the real ads array: percentage = (count of ads matching that condition / total ads) * 100, rounded. N = total ads. The ring fill must reflect that computed percentage dynamically.

  (image 2) The per-competitor KEYWORD drill-down columns ("Top Keywords" horizontal stacked bar + the three-column grid of individual keyword search volumes per competitor) — the keywords, their counts/volumes, and the bar widths must come from the real per-competitor keyword data in the response.

  (image 3) The "Messaging Language" colorful tag cloud AND the "Common Headline Openers" grid — the words/phrases and their ad counts ("X ads") must be derived from the real headlines/copy in the ads dataset.

  (image 4) The per-competitor "unique headlines" columns ("10 unique headlines") — list the actual unique headlines pulled from each competitor's ads in the response.

For every one of the above: if a value is missing in the data, compute a safe fallback (0 / empty) rather than showing a hardcoded number. No static demo numbers should remain — everything renders from the live Get response.

=====================================================
2. AD GALLERY / CREATIVE SECTION — REMOVE TIMELINE VISUAL
=====================================================
In the Ad Gallery summary dashboard secondary metrics row, REMOVE the "Timeline" bar visual entirely (the timeline bar chart component). Keep the other secondary metrics (Activity donut/progress, Creative Mix, Top CTA) intact and reflow the row so it looks balanced without the timeline. Do not remove anything else.

=====================================================
3. RENAME "Competitor Intel" -> "Competitors"
=====================================================
Find every UI label/tab/heading/button text that reads "Competitor Intel" (or "Compititor Intel") and rename the visible text to "Competitors". This is a display-text-only change — do NOT rename any variables, state keys, function names, routes, or props; only the human-readable label string.

=====================================================
4. MAKE AD CARDS / CTA LINKS CLICKABLE TO THE AD DESTINATION (image 5)
=====================================================
Every ad card and its CTA link (the "Learn more", "See details", or the domain text like "tandemdiabetes.com" shown on each ad card — image 5) must be CLICKABLE and, when clicked, open that ad's destination/landing URL in a new browser tab.
  - Use the ad's real destination URL field from the ads data (e.g. ad.destinationUrl || ad.landingUrl || ad.finalUrl || ad.url || ad.link — whichever the Get response provides for that ad).
  - Wrap the clickable element in an anchor or add an onClick that does window.open(destUrl, '_blank', 'noopener,noreferrer').
  - Apply cursor-pointer and keep the existing external-link icon. If an ad has no destination URL, leave it non-clickable (do not render a broken link).
  - Do this for ALL such cards/links across the ad gallery so each one navigates to its own ad's destination.

=====================================================
CONSTRAINTS
=====================================================
- Only touch the files/functions directly related to the five points above.
- Do not change variable names, code style, or structure outside the scope of these changes.
- Do not add extra features, optimizations, or refactors that weren't requested.
- Keep all previously working behavior (the trigger+poll flow, the opaque Add Competitor modal, refresh persistence) intact.
- After implementing, list exactly which files and lines were changed, and why.
