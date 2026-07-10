# CLAUDE.md

This repo is the monorepo of a mobile app that presents news through
AI-generated editorial illustrations. The project follows spec-driven
development.

## Document system (follow in every session)

- **PLANNING.md** → vision, architecture, phases. Read at session start
- **TASKS.md** → task list. Only work on approved tasks listed here, mark
  completed ones, convert new needs into tasks and submit for approval
- **DECISIONS.md** → when an architectural or design decision changes, record
  it with date + rationale. Never contradict PLANNING.md or docs/ silently;
  write here first and ask the user
- **PROGRESS.md** → at the end of each working session add 3-5 lines: what
  was done, what remains, known issues
- **docs/001_initial_schema.sql** → database schema. This is the source of
  truth. Do not regenerate the schema; if a change is needed, propose a new
  migration file and record it in DECISIONS.md
- **docs/haber-app-veri-modeli.md** → pipeline design and rationale

## Working discipline

- Work on tasks ONE at a time. Do not start a new task before finishing one
- No scope creep. Do not add unrequested features, libraries or abstractions
- `pnpm typecheck` must pass clean after every task
- When unsure about a decision, stop and ask instead of assuming

## Architecture summary

- Monorepo: Turborepo + pnpm → `apps/backend` (Next.js App Router, Vercel),
  `apps/mobile` (Expo, later phase), `packages/shared` (types, constants)
- DB: Supabase Postgres + pgvector. Images: Supabase Storage `covers` bucket
- Pipeline (Vercel Cron): fetch → cluster → enrich → images
- Event state machine: clustering → enriching → generating_images →
  published | failed. Every step is idempotent
- Models: enrich = Gemini 2.5 Flash (JSON mode), embedding =
  text-embedding-004, images = Gemini image API

## Hard rules

- Service role key lives ONLY on the server side. It must never leak to
  the client
- The anon side only reads published content permitted by RLS. Reaction and
  push token writes go through API routes
- v1 has a SINGLE cover image per event. `event_cards` is not populated
  (check `app_settings.story_cards_enabled`)
- Images must contain NO recognizable faces of real people and NO text
- Every LLM/embedding/image call is logged to the `api_usage` table
- Every cron step checks `app_settings` daily limits before starting
- Error handling: retry_count increments, after 3 attempts status becomes
  failed with error_message filled

## Code standards

- TypeScript strict, `any` is forbidden
- Runtime validation with Zod: env vars, LLM JSON outputs, API bodies
- Env: `.env.local` is gitignored, `.env.example` stays updated with every
  variable
- Pipeline steps are separate modules:
  `src/pipeline/{fetch,cluster,enrich,images}.ts`
- Code, comments and commit messages in English; user-facing text in Turkish

## Git workflow

- Never commit directly to main. All work happens on feature branches
  (naming: `feat/task-short-name`, `fix/...`)
- TASKS.md marks PR checkpoints. When all tasks in a checkpoint meet their
  definition of done and `pnpm typecheck` passes, commit, push and open a
  PR with `gh pr create`. The PR description lists completed tasks and
  anything the reviewer should pay attention to
- After opening a PR, STOP. Do not start new tasks. The user reviews and
  merges manually
- Never merge a PR yourself and never use `gh pr merge`
- At the start of a session, checkout main and pull before creating a new
  branch

## Commands

- `pnpm dev` → backend dev server
- `pnpm typecheck` → type check across all workspaces