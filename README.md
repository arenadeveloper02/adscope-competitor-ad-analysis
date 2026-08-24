# AdScope — Competitor Ad Analysis

A modern, responsive single-page dashboard for competitor ad analysis. Enter a domain, list competitors with relevance scores, select one or many, and fetch their ads — rendered as a clean card grid. All analysis APIs are mocked with a 1.5s delay so the UI is fully testable out of the box.

## Features

- **Add Extra Competitor** CTA opens a modal; submitting auto-fetches that competitor's ads and appends results
- **Domain input** with "List Competitors" CTA and loading spinner (mock `fetchCompetitors`)
- **Competitors table** with checkbox selection (single / multiple / select-all), name, domain, and match score badges
- **Get Ads for Selected** — disabled with no selection; mock `fetchCompetitorAds` renders ads as cards (competitor, headline, copy, platform)
- Careful loading-state management (`isFetchingCompetitors`, `isFetchingAds`, `isAddingCompetitor`) prevents double-clicks
- Graceful empty states ("No competitors found", "No ads available")
- Analysis sessions are logged to Postgres via a Prisma server action

## Tech Stack

- Next.js 15 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS 3 with Arena Design System tokens (Poppins, brand blue #1A73E8)
- Prisma + Neon Postgres (analysis session logging)

## Local Setup

1. `cp .env.example .env` and set `DATABASE_URL` to a Postgres connection string
2. `npm install`
3. `npm run dev` and open `http://localhost:3000/?emailId=you@example.com`

> The app is gated by an Arena `emailId` query parameter (persisted to a cookie). Without it, the access-denied screen is shown.

## Deploy

On Vercel with Neon connected, `DATABASE_URL` is injected automatically. The build script runs `prisma generate && prisma db push && next build`.
