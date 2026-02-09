# AGENTS.md

This file is both:
- the stable working agreement for agents in this repository, and
- a living project memory that must be appended continuously.

## Living Memory Protocol (Mandatory)
1. Every agent task that changes code, docs, behavior, or understanding must append one new entry under `## Memory Log`.
2. Entries are append-only. Do not rewrite prior entries except by adding a correction note in a new entry.
3. Each entry must include:
   - date/time in UTC
   - what changed
   - why it changed
   - files touched
   - validation performed
   - open risks or follow-ups
4. If a task has no file changes, still append an insight entry if new operational knowledge was discovered.
5. Keep entries concise and factual so future agents can reconstruct current status quickly.
6. New entries must be appended at the end of `## Memory Log` in chronological order; never insert above existing history.

### Entry Template
Use this exact structure when appending:

```md
### YYYY-MM-DD HH:MM UTC | Agent: <name> | Scope: <short scope>
- Change: <what was changed>
- Reason: <why>
- Files: <comma-separated paths>
- Validation: <commands/checks/results>
- Risks/Follow-ups: <none or concrete items>
```

## Repository Guidelines

### Project Structure & Module Organization
The app follows the Next.js App Router layout modelled after `ratio1-drive`. Public routes sit in `app/` (`app/page.tsx` login, `app/dashboard` operations console, `app/dashboard/jobs/new` task creation, `app/dashboard/jobs/[jobId]` deep dive, `app/dashboard/tasks/[jobId]` alias, `app/mesh` node map, and `app/advanced` troubleshooting). UI building blocks live in `components/` (`components/ui` atoms, `components/dashboard` feature widgets, `components/layout` shells/providers, `components/auth` session state). Runtime logic sits in `lib/`: `lib/api` for RedMesh/CStore/R1FS gateways, `lib/domain` for shared metadata (feature catalog, job schemas), `lib/config/env.ts` for Worker App Runner configuration, and `lib/hooks` for client data hooks. Jest specs are grouped in `__tests__/` mirroring the feature surface.

### Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` for local work, `npm run build` + `npm run start` for production parity, `npm run lint` and `npm run typecheck` before review, and `npm test` (or `npm run test:watch`) for API/UI suites.

### Coding Style & Naming Conventions
Author features in strict TypeScript. Prefer function components, kebab-case filenames, and Tailwind utility classes (tokens in `app/globals.css`). Share types through `lib/api/types.ts` and `lib/domain`. Use named exports and keep selectors derived and short. Add brief comments only for non-trivial computations. Prefer service helpers over raw `fetch` calls for Ratio1 endpoints.

### Testing Guidelines
The suite mixes API route checks and Testing Library UI specs. Extend `lib/api/mockData.ts` when adding behavior so offline development matches `edge_node` `develop`. Add at least one happy-path and one failure-path test per feature (authentication, task creation, timelines, diagnostics). Wrap UI tests in real providers (`Providers`) so runtime behavior is representative.

### Commit & Pull Request Guidelines
Use Conventional Commits (`feat(dashboard): surface worker status cards`) and focused PRs. Summaries must state user impact, list verification commands (`npm test`, `npm run lint`), and link Ratio1 issues or relevant `edge_node`/`ratio1-drive` references when mirroring behavior. Include screenshots or console captures when dashboard or diagnostics UX changes. Request review only after lint, type-check, and tests pass locally.

### Environment & Deployment Notes
Worker App Runner can build RedMesh URL from `R1EN_HOST_IP` + `API_PORT`; fallback variables include `EE_REDMESH_API_URL`, `REDMESH_API_URL`, and `R1EN_REDMESH_API_URL`. Live integration expects `EE_CHAINSTORE_API_URL`, optional `EE_R1FS_API_URL`, `EE_HOST_ID`, and peers from `R1EN_CHAINSTORE_PEERS` (or `EE_CHAINSTORE_PEERS` / `CHAINSTORE_PEERS`). Missing critical values trigger `mockMode`. Force flags exist (`EE_FORCE_MOCK_AUTH`, `EE_FORCE_MOCK_TASKS`) and default to true unless explicitly disabled. Sensitive configuration must flow through `lib/config/env.ts`; avoid direct `process.env` access in components. Keep the Swagger surface in `app/advanced` aligned with upstream RedMesh FastAPI.

## Current Snapshot (2026-02-09 UTC)
- App flow is: login (`/`) -> dashboard (`/dashboard`) -> task create (`/dashboard/jobs/new`) -> task deep dive (`/dashboard/jobs/:jobId` or `/dashboard/tasks/:jobId`) -> mesh map (`/mesh`) -> advanced diagnostics (`/advanced`).
- README now documents operator journey explicitly and calls out mode/auth behavior.
- Runtime caveat: `EE_FORCE_MOCK_AUTH` and `EE_FORCE_MOCK_TASKS` default true in `lib/config/env.ts`; live integrations must override them to false.
- Known risk: `lib/config/env.ts` currently logs `process.env` and config to console, which can leak sensitive env data in logs.

## Memory Log

### 2026-02-09 14:00 UTC | Agent: codex | Scope: README + AGENTS documentation hardening
- Change: Rewrote `README.md` to describe the full operator user experience route-by-route, clarified auth/mode behavior, and aligned environment guidance with current config resolution. Converted `AGENTS.md` into a living memory document with mandatory append-only protocol, snapshot section, and structured log template.
- Reason: User requested clearer UX documentation and an always-updated agent memory file for continuity across future agents.
- Files: README.md, AGENTS.md
- Validation: Reviewed route/component/config sources (`app/page.tsx`, `app/dashboard/page.tsx`, `app/dashboard/jobs/new/page.tsx`, `app/dashboard/jobs/[jobId]/page.tsx`, `app/mesh/page.tsx`, `app/advanced/page.tsx`, `lib/config/env.ts`, `lib/api/auth.ts`) to ensure docs match implementation.
- Risks/Follow-ups: Consider removing sensitive `console.log(process.env)` from `lib/config/env.ts`.

### 2026-02-09 14:00 UTC | Agent: codex | Scope: Evaluation refinements
- Change: Removed a stray leading blank line in `README.md`, clarified chronology rule in `AGENTS.md` protocol (append at bottom only), and re-evaluated both docs for requirement fit.
- Reason: Close minor clarity/compliance gaps found during evaluator pass.
- Files: README.md, AGENTS.md
- Validation: Re-read both files end-to-end after patching and checked that UX flow and append-only memory requirements are explicit and actionable.
- Risks/Follow-ups: None.
