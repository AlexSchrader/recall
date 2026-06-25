# CLAUDE.md — Recall

Standing brief for **Claude Code** working in the Recall repo. Read this fully every session before touching code. If anything here conflicts with a one-off instruction in chat, ask — don't silently override.

---

## Working split — read this first

**CC owns the work. Alex supervises.**

- **CC implements, tests, commits, opens PRs, redeploys, and updates the checklist.**
- **Alex reviews the diff, feel-checks the deployed result, decides scope, and merges.**

Alex is the supervisor and the product brain, not the second pair of hands. Default to being thorough and self-sufficient — don't ask permission for routine work, but **do** check in before anything risky (see "Check in before" below). The bar is "Alex can read your PR, run the app for 30 seconds, and either ship it or hand back one concrete piece of feedback."

---

## Project at a glance

**Recall** is an adaptive study PWA. Users upload course material (PDF, DOCX, TXT, MD, images), and the app generates Claude-powered quizzes, flashcards, mini-games, and study guides tuned to each user's preferences and weak topics, with spaced-repetition driving review over time. It also has an in-app French study tutor — **Rappel** — that chats and speaks (ElevenLabs TTS + STT).

- **Stack:** React (Vite) · Node + Express · SQLite (better-sqlite3) · Claude API · ElevenLabs (TTS + STT)
- **Deploy:** single Railway service. Built client served as static files from the same origin as `/api`. SQLite lives on a persistent volume mounted at `/data`.
- **Users today:** owner + 2 friends, all on Free tier. Public tiers / billing not built yet.
- **Source-of-truth docs in this repo:**
  - `docs/Recall_Spec_v1.pdf` — full product specification
  - `docs/recall_checklist.md` — living build checklist (CC maintains this)
  - `docs/Recall_Build_Prompts.md`, `docs/Rappel_Build_Prompts.md`, `docs/Recall_Study_Modes.md`, `docs/Recall_Grading_Fix.md` — sequenced build prompts
  - `brand/README.md` — palette, asset usage, manifest snippet

---

## Workflow

- All production-bound work lands on `main`. Day-to-day development happens on `dev`; commits cherry-pick to `main`. For significant self-contained features, cut a short-lived branch from `main` and PR back — don't let feature branches live past a session.
- **Conventional Commits.** `feat(scope): …`, `fix(scope): …`, `refactor(scope): …`. Scope matches the area (e.g. `feat(flashcards):`).
- **Checklist updates ride with their feature commit**, not in a separate commit on `dev` — that causes recurring cherry-pick conflicts.
- **One stage at a time** when running prompt sequences. Finish, commit, stop. Don't chain stages.

---

## Check in before…

Pause and confirm with Alex before doing any of these, even mid-task:

- **Adding a new dependency** (npm package, service, API). Mention what and why.
- **Changing the data model** — new table, dropped column, renamed field, migration. Schema changes are not "while I was in there" work.
- **Touching auth, sessions, cookies, or `ADMIN_USER_IDS` logic.** One wrong line locks Alex out of his own admin page.
- **Changing tier config, daily caps, model selection, or source-token budgets** in `tiers.js`. Those are tuning decisions, not refactors.
- **Modifying the deploy config** — `railway.toml`, build/start scripts, env var requirements, CSP, trust-proxy, the SPA fallback.
- **Anything destructive** — deleting rows, dropping tables, clearing the volume, force-pushing a branch.
- **Reaching outside the current task's scope** to "tidy up" — unless it's a clear bug, propose first.

**Exception:** if you spot a real bug (crash path, data loss, silent failure, auth bypass), fix it and note what you did. Don't ask permission to prevent a fire.

---

## Proactive improvement — always on

After finishing any task, scan the work and the surrounding code. If any of the below comes up, add a short **"While I was in there…"** note at the end of your reply. Don't pad, don't lecture — flag, suggest, move on.

**Flag bugs and risks.** Force-unwraps and null reaches. Unhandled error paths. N+1 queries. Unbounded result sets. Missing user-scope checks. Secrets in logs. Auth bypasses. Anything that would burn Claude/ElevenLabs credits in a loop.

**Suggest UX improvements.** Loading skeletons, empty states, dead-end navigation, missing confirmations on destructive actions, mobile/dark-mode gaps on new components, confusing labels. Think like a friend opening Recall for the first time.

**Suggest features worth adding.** Small wins first — one-line tuning changes (caps, intervals, model temps) before architectural moves. Rank by user impact, not by how interesting they are to build.

**Brainstorm mode** — when Alex says "what's next" or finishes a feature and asks for direction: propose 3–5 concrete, specific options ranked by impact. *"Add a loading skeleton to Progress so it doesn't flash empty,"* not *"improve the UX."*

**Don't scaffold ahead.** Suggest, get a thumbs up, then build. Accepted suggestions become `[ ]` items in the checklist under the right phase.

---

## Architecture invariants

These are not preferences. Changing any of them is a discussion, not a refactor — see "Check in before."

- **Single Node service.** One process serves the built client (`client/dist`) as static assets *and* all `/api/*` routes from the same origin. No separate frontend deploy, no CORS config.
- **SPA fallback.** In production, any non-`/api` GET returns `client/dist/index.html`. Don't break this.
- **SQLite on `/data`.** Path comes from `process.env.DATABASE_PATH`. Server creates the dir if missing.
- **Env-driven config.** `PORT`, `DATABASE_PATH`, `NODE_ENV`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ADMIN_USER_IDS`. No hardcoded values.
- **Trust proxy + secure cookies in production.** `app.set('trust proxy', 1)` runs *before* the session middleware. Cookies: `secure: true`, `sameSite: 'lax'`, `httpOnly: true` when `NODE_ENV=production`.
- **Claude is server-side only.** API key never reaches the client. All model calls go through `server/src/services/claude.js`. Tier resolves the model via `server/src/config/tiers.js`.
- **Tiers drive model + caps + budgets.** Free → Haiku 4.5, Plus → Sonnet 4.6, Pro → Opus 4.8. Grading is always Haiku across all tiers. Never hardcode model strings in feature code.
- **One shared daily cap** for quiz gen + flashcard gen + study guide gen. **Chat is intentionally excluded** — no cap on talking to Rappel. Don't "tidy this up."
- **All DB queries scope by `user_id`.** Never trust an id from a route without confirming the caller owns it.
- **Mastery is per-topic, shared across modes.** Quizzes, flashcards, and mini-games all feed the same `topic_mastery` row. SM-2 lives in `server/src/services/sm2.js`. Don't fork mastery logic per feature.

---

## Code conventions

- **JavaScript (JSX), no TypeScript.** Not in client, not in server. Don't add `.ts` files. Don't propose a migration.
- **No inline SQL in route handlers.** All queries live in `server/src/db/*Db.js` modules.
- **Components come from `client/src/components/shared/`** unless there's a specific reason to one-off.
- **Theme tokens, not hex.** Colors come from the theme context. No inline hex except in the brand kit and theme definitions.
- **Markdown rendering uses `react-markdown`.** Allowed: bold, italic, lists, inline code, code blocks, headings, links. No raw HTML.
- **API wrapper at `client/src/api.js`** with `credentials: 'include'`. UI never calls `fetch` directly to `/api`.
- **Errors return `{ error: string }`** with a correct HTTP status. Central error middleware shapes responses.
- **`usage_log` writes happen inside `claude.js`** so every Claude call logs automatically. Don't bypass it.
- **Tests use Vitest + supertest, with external boundaries mocked.** The suite must be deterministic — never hit Anthropic, ElevenLabs, Resend, or Wikipedia. Two layers:
  - *Pure unit tests* (`__tests__/*.test.js`) cover pure functions (grading, prompt builders, source-context selection, exam countdown).
  - *Route-level integration tests* (`__tests__/integration/*.test.js`) drive the real Express app via supertest against a fresh in-memory SQLite DB (`DATABASE_PATH=:memory:`, schema from the same migration code production runs). Seed helpers live in `__tests__/helpers/seed.js`; global env + mocks in `__tests__/setup/integration.setup.js`. Mocked at the module boundary: `services/claude.js` (`generate` returns deterministic JSON per `_meta.feature`; `getGenerationConfig` stays real), `services/rappel.js` (chat streams through the Anthropic client directly, so it's mocked separately from `claude.js`), `services/wikipedia.js`, `services/email.js`. ElevenLabs has no service module — voice routes are tested up to the PIN gate with `ELEVENLABS_API_KEY` unset so any TTS path fails closed (503).
  - `vitest.config.js` uses `pool: 'forks'` — better-sqlite3 is a native addon that segfaults on worker-thread teardown; the setup file also closes the DB handle in `afterAll`.
  - **New cross-cutting middleware (auth, scoping, rate-limit, cap) lands with regression tests in this harness** — owner happy-path, cross-user denial, and (where IDs come from the body) body-id trust.

---

## Rappel persona constraints

- Warm French study tutor inside Recall. Speaks English with a French accent. Sprinkles French generously (one phrase every 2–4 sentences). Never writes full paragraphs in French.
- Does not break character. Never mentions being an AI, Claude, or Anthropic. If asked, he's just Rappel.
- References the user's actual courses, units, and weak topics when available via the `{{USER_CONTEXT}}` placeholder.
- Tone: encouraging, patient, a touch playful. Never condescending. Never sycophantic.
- Persona lives in `server/src/config/rappel.js`. Tuning happens there, not scattered across services.

---

## Hard "don'ts"

- **Don't introduce a new package manager.** npm workspaces only.
- **Don't add a second frontend framework.** React only.
- **Don't add a second database.** SQLite via better-sqlite3 only, until there's a real reason to migrate.
- **Don't reach across users.** No query should ever return another user's data.
- **Don't log secrets.** No `console.log` of API keys, sessions, cookies, raw bcrypt hashes, or full prompt bodies. Token *counts* are fine; *contents* are not.
- **Don't break the SPA fallback or static-serve order.** Static files first, `/api/*` second, catch-all to `index.html` last.
- **Don't silently change cap, budget, or tier model values.**
- **Don't reproduce copyrighted text from uploaded documents** beyond what's needed to ground a question. Paraphrase, cite location.

---

## When in doubt

1. Check the spec PDF (`docs/Recall_Spec_v1.pdf`).
2. Check the build prompt doc for the feature area.
3. Check the checklist (`docs/recall_checklist.md`).
4. If those don't resolve it, ask before coding.
