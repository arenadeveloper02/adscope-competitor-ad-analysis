# Repository Summary: adscope-competitor-ad-analysis

> Auto-maintained by Sim Development. Last updated: 2026-08-25T17:00:20.667Z.

## Overview

Competitor ad analysis dashboard: discover competitors for any domain, run ads intelligence workflows, and explore market insights, ad galleries, competitor intel, and creative analysis.

**Repository:** `adscope-competitor-ad-analysis`  
**File count:** 40

## Features

- Domain-based competitor discovery via Arena workflow
- Manual competitor addition with opaque centered modal
- Ads analysis trigger + polling workflow
- Market Insights dashboard with KPIs, scorecards, and heatmap
- Ad Gallery with search and format filters
- Competitor Intel and Creative Analysis tabs
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

- **Updated at:** 2026-08-25T17:00:20.667Z
- **Request:** Fix ONLY the "Add Competitor" modal transparency bug. The modal is still rendering completely see-through: its heading ("Add Competitor"), the "Manually add a competitor..." text, the COMPETITOR NAME / COMPETITOR DOMAIN / DESCRIPTION labels, the input placeholders, and the Cancel / Add Competitor buttons are all overlapping and bleeding through onto the competitor table behind it, making everything unreadable. The previous fix did not work because the modal's content card has no opaque background fill and there is no dimming backdrop. Apply the exact fix below. Do not modify, refactor, remove, or clean up any other part of the code. Preserve all existing formatting, naming, comments, and logic. Do NOT change any JavaScript, state, handlers, or the Add/Cancel logic — this is a className/CSS-only change.

EXACT FIX — find the "Add Competitor" modal JSX (the element wrapping the "Add Competitor" heading, the domain/name/description inputs, and the Cancel / Add Competitor buttons) and restructure its wrappers so it renders as an OPAQUE centered dialog over a DIMMED backdrop:

1. OUTER WRAPPER (backdrop + centering) — the outermost modal div must be:
   className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
   (fixed full-screen, high z-index, dark semi-transparent backdrop that dims the page, flex-centered).

2. INNER CONTENT CARD (the actual dialog box) — must be a DIRECT child of the wrapper and have a FULLY OPAQUE solid background and its own stacking:
   className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6"
   - The background MUST be a solid opaque color: bg-white (add dark:bg-slate-900 only if the app already has a dark theme). Do NOT use bg-white/xx, backdrop-blur alone, opacity-*, or any semi-transparent utility on this card.
   - Keep the existing inner content (heading, description, labels, inputs, buttons) exactly as-is inside this card — do not change their markup or text.

3. Ensure there is exactly ONE such wrapper+card structure (no leftover transparent outer container). If the current modal already has a wrapper, MERGE these classes into it rather than adding a duplicate. The end result: a dark dimmed overlay covers the whole screen, and a solid white card floats opaquely in the center so nothing behind it shows through.

CONSTRAINTS:
- Only touch the "Add Competitor" modal's container/wrapper className(s). Nothing else.
- Do not change variable names, code style, JS logic, or any other component.
- Do not add features or refactors.
- After implementing, list exactly which file and lines were changed, and why.
