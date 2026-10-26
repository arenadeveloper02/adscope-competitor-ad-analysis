# adscope-competitor-ad-analysis

Verification + minimal edit pass. All requested behaviors were confirmed to already exist in the codebase and were preserved byte-for-byte: (1) components/DashboardClient.tsx — handleGetAdsForSelected already fires API 1 (cca441d4 trigger workflow) with the exact payload { companyName, email, competitorDetails: [{ company_domain_url, company_name, competitor_description, competitor_domain_url, name }] }, immediately starts a 20-second setInterval (POLL_INTERVAL_MS = 20000) that calls API 2 (44a45367 Get workflow via fetchDashboardData with { email, company_name }) to render interim DB data, awaits API 1 and on { success: true, output: { result: { status: 'success' } } } (isTriggerSuccess) clears the interval and fires API 2 one final time; the LONG_RUN_MESSAGE ('Analyzing competitor ads... This process takes 8-12 minutes...') stays visible until that final call completes, and the isRestoring spinner already covers the refresh/restore flow (loadDashboardSnapshot + getLastAnalyzedDomain + fetchDashboardData). (2) Tab rename — the TABS array in DashboardClient.tsx and the Competitors heading in CompetitorIntel.tsx already read exactly 'Competitors' (no 'Competitor Intel' string remains). (3) components/CreativeAnalysis.tsx already renders the per-competitor keyword drill-down grid (competitorKeywordColumns) with horizontal progress bars, counts, cursor-pointer keyword buttons wired through openCompany → onFilterGallery / onOpenCompetitors, and a 'View all X ads' button per column using competitorAdCounts. No lines in those files were modified, so the modal CSS fixes, sticky header, 6-month date restriction, and all UI layouts remain untouched. FILES ACTUALLY CHANGED: [1] package.json — replaced the range version '^15.3.3' with the mandated exact pins next 16.2.12 and eslint-config-next 16.2.12 (no caret/tilde ranges allowed) and aligned the build script to 'prisma generate && prisma db push && next build' to match the deploy pipeline; all other dependencies unchanged. [2] prisma/schema.prisma — returned verbatim (mandatory echo on every database-backed edit); zero columns added, removed, renamed, or retyped — AppSetting, AnalysisSession, DashboardSnapshot, and SheetExport remain byte-for-byte identical including every createdAt/updatedAt field.

## Features

- API 1 trigger workflow fired with exact competitorDetails payload (company_domain_url, company_name, competitor_description, competitor_domain_url, name)
- API 2 Get workflow polled every 20 seconds with { email, company_name } while API 1 runs, rendering interim database data
- Final API 2 fetch on API 1 success (output.result.status === 'success') with polling interval cleared
- Persistent long-run message during the 8-12 minute analysis window
- Refresh-time restore spinner (isRestoring) until saved snapshot and latest run load from the database
- Navigation tab labeled exactly 'Competitors'
- Creative Analysis per-competitor keyword drill-down columns with volume bars and clickable 'View all X ads' buttons wired to the Ad Gallery/Competitors filters
- Server-side session snapshots keyed by Arena emailId (Neon Postgres via Prisma)

## Tech Stack

- Next.js 16.2.12 (App Router)
- React 19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Routes

- `/`

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

1. Copy `.env.example` to `.env` for local development
2. Set `DATABASE_URL` to your Postgres connection string
3. Run `npx prisma db push` before `npm run dev` if tables are missing

On Vercel, `DATABASE_URL` is injected when Neon is connected to the project.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build (runs Prisma generate/push when configured)
- `npm run start` — run the production server locally

## Deploy

This project is intended for deployment on [Vercel](https://vercel.com). Connect the GitHub repository and deploy the `main` branch.
