# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T16:08:40.941Z.

## Overview

AdScope discovers competitors for any domain and analyzes their ads across platforms with persistent, per-user dashboard sessions.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 40

## Features

- Competitor discovery by domain via Arena workflow
- Two-step ads analysis (trigger + get) with dashboard restore on refresh
- Opaque Add Competitor modal with dimmed backdrop
- Server-side session persistence keyed by Arena emailId (DashboardSnapshot)
- Market insights, ad gallery, competitor intel, and creative analysis tabs

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

- **Updated at:** 2026-08-25T16:08:40.941Z
- **Request:** Implement the following two fixes in the codebase. Do not modify, refactor, remove, or "clean up" any other part of the code beyond what is explicitly listed below. Preserve existing formatting, naming conventions, comments, and logic in all unrelated sections.

=====================================================
FIX 1 — "ADD COMPETITOR" MODAL IS TRANSPARENT
=====================================================
BUG: The "Add Competitor" modal is rendering with a transparent/see-through container. Its text ("Add Competitor", "Enter the competitor's domain...", the input placeholder "e.g. competitor.com", and the Cancel/Add buttons) visually overlaps the competitor table and background behind it, making it unreadable.

FIX:
- Locate the "Add Competitor" modal component/JSX (the dialog containing the "Add Competitor" heading, the domain input, and the Cancel / Add buttons).
- Give the modal's MAIN CONTENT container a SOLID opaque background: bg-white (add dark-theme variant only if the app already uses one, e.g. dark:bg-slate-800). Do NOT use any bg-*/opacity, bg-white/80, or semi-transparent utility on the content card itself.
- Ensure the content card has: rounded corners (rounded-xl or existing radius), padding (existing p-*), shadow-xl, and z-50.
- Add a dimmed backdrop OVERLAY behind the modal (a separate absolutely/fixed positioned div): fixed inset-0 bg-black/50 with a lower z-index (e.g. z-40) than the content card, so the card sits opaquely ON TOP of the dimmed backdrop.
- Ensure the modal content uses relative positioning and is centered (fixed inset-0 flex items-center justify-center) so it is not accidentally transparent due to missing background or stacking context.
- DO NOT change any of the modal's JavaScript, state, handlers, or the Add/Cancel logic. This is a CSS/className-only fix.

=====================================================
FIX 2 — DASHBOARD DATA IS ERASED ON PAGE REFRESH (MUST PERSIST)
=====================================================
BUG: When the user refreshes the browser/tab, the entire analysis state is wiped — the company domain, selected competitors, and all dashboard/ads data disappear and the app resets to the initial "Analyze a Domain" screen.

FIX: On app load, automatically restore the previous session's data so the user resumes exactly where they left off.

- Implement a useEffect hook (or equivalent init logic) in the main component that fires ONCE on mount.
- It should re-fetch the most recent analysis for the current user from the Get workflow endpoint (same API already used to populate the dashboard):
    POST https://agent.thearena.ai/api/workflows/44a45367-2ae0-406f-b745-6b2e2bef52fe/execute
    Headers: 'Content-Type': 'application/json', 'X-API-Key': 'sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-'
    Body (exact keys, lowercase/snake_case): { "email": userEmail, "company_name": companyDomain }
  Use the last-known userEmail and companyDomain — persist those two values in localStorage whenever an analysis is run, and read them back on mount so the refresh fetch knows which record to load. Order/pick the MOST RECENT run for that user (backend already returns latest; if multiple, use the newest by last_updated).
- If a recent run is returned, restore ALL of: the company domain input value, the selected competitors (checkbox selections), and every dashboard visual (KPI cards, ad cards grid, Insights, Creative Analysis). Reveal the dashboard tabs and hide the initial empty state — exactly as if the data had just loaded from Get Ads for Selected.
- If no prior run exists (empty response / first-time user), fall back to the current initial screen — do not error.
- Persist the minimal restore keys in localStorage (e.g. companyDomain and userEmail, and optionally the last dashboard payload as a cache for instant paint before the network refetch resolves). Rehydrate from localStorage first for instant render, then refresh from the Get API.
- Do NOT change the existing handleGetAdsForSelected two-step flow logic — only ADD the persistence/restore-on-mount behavior and the localStorage writes at the point where an analysis successfully completes.

=====================================================
CONSTRAINTS
=====================================================
- Only touch the files/functions directly related to the two points above.
- Do not change variable names, code style, or structure outside the scope of these changes.
- Do not add extra features, optimizations, or refactors that weren't requested.
- If a change requires touching a shared/common file, make the minimal edit needed and leave everything else untouched.
- After implementing, list exactly which files and lines were changed, and why.
