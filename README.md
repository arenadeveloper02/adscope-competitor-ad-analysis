# adscope-competitor-ad-analysis

Fixed the two-step ads analysis flow: Step 1 triggers the Competitor Intelligence Agent Final workflow with the exact keys { companyName, Email, competitorDetails (stringified) } and waits for success; Step 2 fetches the dashboard from the Get workflow with the exact keys { email, company_name } and the correct API key. Loading state stays active across both calls. Files changed: components/DashboardClient.tsx (handleGetAdsForSelected rewritten to chain both workflows with exact key names, success check on the trigger response, and companyDomain passed to Step 2), lib/dashboard-actions.ts (fetchDashboardData now accepts companyName, posts { email, company_name } with API key sk-sim-tuJgJPxfUPn2zjFWRMTxxKDaB3tKQLJ-), plus components/TopNav.tsx, components/AddCompetitorModal.tsx, components/Spinner.tsx kept in sync with the DashboardClient contract. prisma/schema.prisma was not provided in the edit context and no database change was requested, so the live schema file is left untouched to avoid any risk of column drift.

## Features

- Two-step ads analysis: trigger Final workflow, then fetch results from Get workflow
- Exact payload keys per workflow: { companyName, Email, competitorDetails } for trigger and { email, company_name } for get
- Loading/disabled state persists across the entire long-running analysis
- Dashboard populated only from the successful Get workflow response
- Competitor discovery, ad gallery, competitor intel, and creative analysis tabs

## Tech Stack

- Next.js ^15.3.3 (App Router)
- React ^19.0.0
- Tailwind CSS v3
- TypeScript
- Prisma + PostgreSQL (Neon on Vercel)

## Routes

- `/`
- `/access-denied`

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
- `npm run bu
…(truncated)