# PROGRESS.md

Session log. At the end of each working session, add 3–5 lines: what was
done, what remains, known issues. Newest entry on top.

## Entry template

```
### YYYY-MM-DD — Session summary
- **Done:**
- **Remaining:**
- **Known issues:**
```

---

### 2026-07-11 — Checkpoint 2: Supabase foundation & seeds
- **Done:** tasks 2.1–2.4 — schema verified in Supabase (10 tables, view,
  pgvector, seeds); server-only service-role client; typed getSetting +
  logApiUsage helpers with temp /api/dev/smoke route; idempotent seed
  script with 2 verified Anadolu Ajansı feeds (gündem + ekonomi)
- **Remaining:** checkpoints 3–4 (fetch step, cluster step + wiring)
- **Known issues:** /api/dev/smoke is temporary, remove in checkpoint 3;
  Claude's WebFetch also hangs — feed verification goes through the user;
  Turkish news sites need a browser User-Agent (noted in task 3.1);
  .env.example gitignore decision still pending

### 2026-07-10 — Checkpoint 1: monorepo skeleton
- **Done:** TASKS.md approved; tasks 1.1–1.4 (Turborepo+pnpm workspace,
  Next.js backend with /api/health, @deef/shared, Zod env validation +
  .env.example); two decisions recorded in DECISIONS.md; stale RLS note
  added to docs/haber-app-veri-modeli.md; command-execution rules added to
  CLAUDE.md
- **Remaining:** Phase 1 checkpoints 2–4 (Supabase foundation & seeds,
  fetch step, cluster step + wiring)
- **Known issues:** build tools (pnpm/turbo/tsc/next) can't run in Claude's
  shell — verification handed to the user; `.env.example` is currently
  gitignored, which contradicts CLAUDE.md's "committed template" intent —
  pending user decision
