# LLM Reliability Lab

Cloud-hosted, free-tier-friendly LLM eval and regression platform built with:

- Next.js App Router + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS)
- Vercel serverless routes for BFF/API
- Optional CLI + GitHub Actions integration

This repo implements the full UI-first flow:

1. User logs in at `/login`
2. User creates/opens project at `/projects`
3. User views dashboard at `/projects/:projectId`
4. User manages suites/tests at `/projects/:projectId/suites/:suiteId`
5. User runs evals and inspects runs at `/runs/:runId`
6. User compares baseline/candidate at `/runs/:runId/diff/:baselineId`
7. User debugs single test at `/tests/:testId?runId=...`

## Route Map

- `/login`
- `/projects`
- `/projects/[projectId]`
- `/projects/[projectId]/suites/[suiteId]`
- `/runs`
- `/runs/[runId]`
- `/runs/[runId]/diff/[baselineId]`
- `/tests`
- `/tests/[testId]`

API routes:

- `GET/POST /api/projects`
- `GET /api/projects/:projectId/overview`
- `GET /api/suites/:suiteId`
- `GET/POST /api/suites/:suiteId/tests`
- `GET/POST /api/suites/:suiteId/runs`
- `GET /api/runs`
- `GET /api/runs/:runId`
- `GET /api/runs/:runId/results`
- `GET /api/runs/:runId/diff/:baselineId`
- `GET /api/diff/test?runId=...&baselineId=...&testId=...`
- `GET /api/tests`
- `GET /api/tests/:testId`
- `GET /api/tests/:testId/results?runId=...`

## Architecture

### Option A (implemented now)

Synchronous run execution in `POST /api/suites/:suiteId/runs`:

1. Create `runs` row (`running`)
2. Create `run_configs` row
3. Load suite tests
4. For each test:
   - call LLM provider (`lib/evals/provider.ts`)
   - evaluate output (`lib/evals/evaluator.ts`)
   - write `results` row
5. Aggregate and write `run_metrics`
6. Mark run `completed` or `failed`

### Option B (later)

Move step 4 to a background worker that polls a jobs table. UI and DB schema remain compatible.

## Database

Migration file:

- `supabase/migrations/202602160001_initial_schema.sql`

Tables included:

- `projects`
- `suites`
- `tests`
- `runs`
- `run_configs`
- `results`
- `run_metrics`

Includes:

- FK constraints
- indexes for list/diff queries
- RLS policies for per-user data isolation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_API_KEY` (for CLI/CI calls)
- optional `LLM_PROVIDER_API_KEY`
- `LLM_PROVIDER_BACKEND` (`openai` or `groq`)
- `LLM_PROVIDER_MODEL` (for Groq example: `llama-3.1-8b-instant`)

4. Apply SQL migration in Supabase SQL Editor:

- paste `supabase/migrations/202602160001_initial_schema.sql`
- run once

5. Start app:

```bash
npm run dev
```

6. Open:

- `http://localhost:3000/login`

## Supabase Auth Setup

In Supabase dashboard:

1. Authentication -> Providers -> enable GitHub
2. Add callback URL:
   - local: `http://localhost:3000/auth/callback` (if used)
   - prod: `https://<your-vercel-domain>/auth/callback`
3. Authentication -> URL Configuration:
   - Site URL = your Vercel URL
   - Redirect URLs include local + prod routes

## Vercel Deployment

1. Push repo to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.example`
4. Deploy
5. Set same env vars for Preview + Production

## CLI

Script:

- `cli/llm-lab.mjs`

Required env for CLI:

- `LLM_LAB_API_URL` (for example `https://your-app.vercel.app`)
- `LLM_LAB_INTERNAL_API_KEY` (must match `INTERNAL_API_KEY` in app env)
- `LLM_LAB_USER_ID` (Supabase auth user UUID)

Commands:

```bash
node cli/llm-lab.mjs sync --suite <suite_id> --file examples/suites/support-basic.json
node cli/llm-lab.mjs run --suite <suite_id> --model gpt-4.1-mini --temperature 0.2
```

## GitHub Actions

Workflow file:

- `.github/workflows/llm-lab-pr.yml`

Required repository secrets:

- `LLM_LAB_API_URL`
- `LLM_LAB_INTERNAL_API_KEY`
- `LLM_LAB_USER_ID`
- `LLM_LAB_SUITE_ID`
- `LLM_LAB_MIN_PASS_RATE` (for example `0.9`)

Behavior:

1. Trigger eval on PR
2. Fetch run metrics
3. Fail workflow if `pass_rate < LLM_LAB_MIN_PASS_RATE`

## Notes

- If `LLM_PROVIDER_API_KEY` is missing, the app uses a deterministic mock provider response so you can test the full UX without paid model calls.
- Raw output + judge/check details are stored in `results.raw_output`.
- Diff page compares baseline/candidate by `test_id` and surfaces regressions/improvements.

