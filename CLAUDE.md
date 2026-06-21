# CLAUDE.md

Standing brief for **Claude Code** working in the Recall repo. Read this fully every session before touching code. If anything here conflicts with a one-off instruction in chat, ask — don't silently override.

---

## Project at a glance

**Recall** is an adaptive study PWA. Users upload course material (PDF, DOCX, TXT, MD, images), and the app generates Claude-powered quizzes, flashcards, and study guides tuned to the user's own preferences and weak topics, with spaced-repetition driving review over time. It also has an in-app French study tutor — **Rappel** — that chats and speaks (ElevenLabs TTS + STT).

- **Stack:** React (Vite) · Node + Express · SQLite (better-sqlite3) · Claude API · ElevenLabs (TTS + STT)
- **Deploy:** single Railway service. Built client served as static files from the same origin as `/api`. SQLite lives on a persistent volume mounted at `/data`.
- **Users today:** owner + 2 friends, all on Free tier. Public tiers / billing not built yet.
- **Source of truth docs in this repo:**
  - `docs/Recall_Spec_v1.pdf` — full product specification (architecture, data model, endpoint list, etc.)
  - `docs/recall_checklist.md` — living build checklist (Claude Code maintains this — see below)
  - `docs/Recall_Build_Prompts.md`, `docs/Rappel_Build_Prompts.md`, `docs/Recall_Study_Modes.md`, `docs/Recall_Grading_Fix.md` — sequenced build prompts for each feature area
  - `brand/README.md` — palette, asset usage, manifest snippet

---

## Working agreement

- **Branches + PRs always.** Branch from `main`, PR back to `main`. No direct pushes to `main`.
- **Conventional Commits.** `feat(scope): …`, `fix(scope): …`, `refactor(scope): …`, etc. Scope matches the area touched (e.g. `feat(flashcards):`, `fix(auth):`).
- **Do only what the current prompt asks.** Don't scaffold ahead. Don't pre-build "while you're in there." If a follow-up would be useful, add it as a `[ ]` item in `docs/recall_checklist.md` instead.
- **Ask before reinterpreting.** If a request conflicts with the spec, the checklist, or this file, flag it instead of guessing.
- **Update the checklist on every merge.** See the marking protocol at the top of `docs/recall_checklist.md`. Stamp `[x]` with `— DONE <YYYY-MM-DD HH:MM>, PR #<n>`. Never delete completed items. Use `[~]` for branches that are open but not merged.
- **One stage at a time when running prompt sequences.** Build prompt docs are explicitly numbered. Finish a stage, commit, stop. Don't chain stages.

---

## Architecture invariants

These are not preferences. Changing any of them is a discussion, not a refactor.

- **Single Node service.** One process serves the built client (`client/dist`) as static assets *and* all `/api/*` routes from the same origin. No separate frontend deploy, no CORS config.
- **SPA fallback.** In production, any non-`/api` GET returns `client/dist/index.html` so React Router handles it. Don't break this.
- **SQLite on `/data`.** Path comes from `process.env.DATABASE_PATH`. Server must create the dir if missing. Never write SQLite to a non-persistent path in production.
- **Env-driven config.** `PORT`, `DATABASE_PATH`, `NODE_ENV`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ADMIN_USER_IDS`. No hardcoded ports, paths, keys, or admin IDs.
- **Trust proxy + secure cookies in production.** Railway terminates HTTPS at a proxy. `app.set('trust proxy', 1)` runs before the session middleware. Cookies: `secure: true`, `sameSite: 'lax'`, `httpOnly: true` when `NODE_ENV=production`.
- **Claude is server-side only.** The API key never reaches the client. All model calls go through `server/src/services/claude.js`. Tier resolves the model via `server/src/config/tiers.js`.
- **Tiers drive model + caps + budgets.** Free → Haiku 4.5, Plus → Sonnet 4.6, Pro → Opus 4.8. Grading is always Haiku across all tiers. Caps and source-token budgets come from `tiers.js`. Never hardcode model strings in feature code.
- **One shared daily cap** for quiz gen + flashcard gen + study guide gen. **Chat is intentionally excluded** — no cap on talking to Rappel. Don't "tidy this up" by folding chat into the cap.
- **All DB queries scope by `user_id`.** Never trust an id from a route without confirming the caller owns it. Mirror the pattern in `coursesDb.js` / `chatDb.js`.
- **Mastery is per-topic, shared across modes.** Quizzes, flashcards, and (future) other study modes all feed the same `topic_mastery` row for a `(user, course, topic)`. SM-2 scheduling lives in `server/src/services/mastery.js`. Don't fork mastery logic per feature.

---

## Code conventions

- **JavaScript (JSX), no TypeScript.** Not in client, not in server. Don't add `.ts` files. Don't add `tsconfig.json`. Don't propose a migration.
- **Repo layout** follows Section 18 of the spec — keep new files inside it.
- **No inline SQL in route handlers.** All queries live in `server/src/db/*Db.js` modules. Route handlers call those.
- **Components come from `client/src/components/shared/`** unless there's a specific reason to one-off. No re-implementations of `Button`, `TextField`, `Modal`, etc.
- **Theme tokens, not hex.** Colors come from the theme context. No inline hex except in the brand kit and theme definitions themselves.
- **Markdown rendering uses `react-markdown`** (already installed). Allowed elements: bold, italic, lists, inline code, code blocks, headings, links. No raw HTML.
- **API wrappers in `client/src/api/`** with `credentials: 'include'`. UI never calls `fetch` directly to `/api`.
- **Errors return `{ error: string }`** with a correct HTTP status. The centralized error middleware is the single place that shapes error responses.
- **`usage_log` writes happen inside `claude.js`** so every Claude call logs automatically. Don't bypass it. ElevenLabs usage logging extends this pattern.
- **Tests use Vitest + supertest, with `claude.js` mocked.** The test suite must be deterministic and must not hit the real Anthropic or ElevenLabs API.

---

## Rappel persona constraints

- Rappel is a warm French study tutor inside the Recall app. Speaks English with a French accent and sprinkles French generously (one phrase every 2–4 sentences). Never writes full paragraphs in French — users are studying their coursework, not French.
- Does not break character. Does not mention being an AI, Claude, or Anthropic. If asked, he's just Rappel.
- References the user's actual courses, units, and weak topics when available (`{{USER_CONTEXT}}` placeholder, populated at request time).
- Tone: encouraging, patient, a touch playful. Never condescending. Never sycophantic.
- Persona lives in `server/src/config/rappel.js`. Tuning happens there, not scattered across services.

---

## Hard "don'ts"

- **Don't introduce a new package manager.** npm workspaces only. No pnpm, no Yarn, no Bun.
- **Don't add a second frontend framework.** React only. No Next.js, no SvelteKit, no Astro layered on.
- **Don't add a second database.** SQLite via better-sqlite3 only, until there's a real reason to migrate (and that's a discussion).
- **Don't reach across users.** No query, route, or service should ever return another user's data. If you're tempted to add a "by id only" shortcut, add the user-scope check anyway.
- **Don't log secrets.** No `console.log` of API keys, session tokens, cookies, raw bcrypt hashes, or full prompt bodies. Token *counts* are fine; token *contents* are not.
- **Don't break the SPA fallback or the static-serve order.** Static files first, `/api/*` routes, then the catch-all to `index.html`. Reordering this silently breaks deep links.
- **Don't silently change cap, budget, or tier model values.** Those are tuning decisions, not refactors. If you think one is wrong, flag it.
- **Don't reproduce copyrighted text from uploaded documents in chat or quiz output beyond what's needed to ground a question.** Paraphrase, cite source location, keep direct quotes minimal.

---

## When in doubt

1. Check the spec PDF first (`docs/Recall_Spec_v1.pdf`).
2. Check the build prompt doc for the feature area you're in (`docs/*_Build_Prompts.md`, `docs/Recall_Study_Modes.md`, `docs/Recall_Grading_Fix.md`).
3. Check the checklist for current state (`docs/recall_checklist.md`).
4. If those don't resolve it, ask before coding.
