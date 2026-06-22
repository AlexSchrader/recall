# Recall — Build Checklist & Progress Tracker

**Purpose:** the single source of truth for where Recall stands. Open this first after any break to see what's done, what's stuck, and the one next thing to do. Lives in the repo at `docs/recall_checklist.md`; **CC (Claude Code) maintains it** as work lands on `main`.

---

## How to use this doc — READ FIRST

**If you're Alex, resuming after a break:**
Read **Status at a glance** below, then jump to the first `[ ]` (or `[!]`) item in the **current phase**. That's your next action. Don't re-do anything already marked `[x]` — and check **Dead ends & gotchas** before retrying anything that "should work," because it may already have failed for a known reason.

**If you're CC, maintaining this doc — marking protocol (follow verbatim):**
When a task finishes, you must:
1. Change `[ ]` to `[x]`.
2. Append ` — DONE <YYYY-MM-DD HH:MM local>, <commit/PR ref>`.
3. Add any follow-ups you surfaced as new `[ ]` items in the right phase, each with a one-line *why*.
4. Update the **Status at a glance** block (phase, in-flight, next action, date).
5. **Never delete** completed tasks — they stay checked in place as the project's memory.
6. Use `[~] — STARTED <date>` for work that's pushed but not yet confirmed working; flip to `[x]` only when a green build or feel-check actually confirms it.
7. Use `[!] — BLOCKED ON: <thing>` for anything stuck on a dependency, so it's never mistaken for a plain todo.
8. **Checklist updates ride with their feature commit.** Put the `[ ]` → `[x]` edit in the *same commit* (or at least the same cherry-pick batch) as the feature work it stamps. Updating the checklist in a separate commit on `dev` creates recurring merge conflicts when cherry-picking to `main`.
9. When you discover a gotcha that wasn't obvious from the docs — a bug that took real time to diagnose, an integration that fought back, a "should work but doesn't" — append it to **Dead ends & gotchas** so the next session doesn't re-walk it.

---

## Status at a glance

- **Current phase:** Phase 3 — Flashcards (S3 + S4 open) **OR** Phase 5 — Rappel hardening, your call
- **In flight:** Nothing open right now (between tasks)
- **⚡️ Single next action (Alex):** Pick one and update this line — either **S3** (`docs/Recall_Study_Modes.md`, flashcard API + review UI) or **G1** (`docs/Recall_Grading_Fix.md`, lenient grading)
- **Last updated:** 2026-06-22

---

## Legend

- `[ ]` todo
- `[~]` in progress (work open, not merged)
- `[x]` done (stamped)
- `[!]` blocked (note what it's blocked on)
- `(pre-tracker)` = completed before this tracker existed; no reliable timestamp
- **Owner tags:** `(Alex)` = portal/UI clicks + decisions · `(CC)` = repo edits, commits, deploys · `(Claude)` = planning, briefs, asset generation

---

## Phase 0 — Foundation *(complete)*

- [x] Monorepo scaffold (client + server workspaces, Vite + Express) — (pre-tracker) (CC)
- [x] SQLite schema + query layer (users, courses, units, documents, quizzes, questions, attempts, topic_mastery, preferences) — (pre-tracker) (CC)
- [x] Tier config + Claude API client wrapper — (pre-tracker) (CC)
- [x] Document ingestion (PDF, DOCX, TXT, Markdown, image) + chunked source context — (pre-tracker) (CC)
- [x] Quiz generation engine (Claude, MCQ + true/false + short answer) — (pre-tracker) (CC)
- [x] Auto-grading (exact match + Claude-assisted for short answers) — (pre-tracker) (CC)
- [x] SM-2 spaced repetition — weak topics surface in future quizzes — (pre-tracker) (CC)
- [x] Quiz player + result screen with per-question breakdown — (pre-tracker) (CC)

## Phase 1 — Auth & sessions *(complete)*

- [x] Email + password register/login — (pre-tracker) (CC)
- [x] Password reset via Resend email — (pre-tracker) (CC)
- [x] Persistent SQLite session store (survives Railway redeploys) — (pre-tracker) (CC)
- [x] Trust-proxy + secure cookie config for Railway HTTPS — (pre-tracker) (CC)

## Phase 2 — UI shell, branding, deploy *(complete)*

- [x] Onboarding empty state for new users — (pre-tracker) (CC)
- [x] Course creation with Open Library textbook search — (pre-tracker) (CC)
- [x] Inline course rename + delete — (pre-tracker) (CC)
- [x] Sticky nav, fixed chat layout — (pre-tracker) (CC)
- [x] Courses + Rappel tabs — (pre-tracker) (CC)
- [x] Wikipedia context injection into quiz generation — (pre-tracker) (CC)
- [x] Recall brand kit installed — icons, manifest, lockup on sign-in screen, CSP image fix — (pre-tracker) (CC/Claude)
- [x] Railway single-service deploy (persistent volume at `/data`, SPA fallback, CSP headers, asset caching) — (pre-tracker) (CC/Alex)

## Phase 3 — Flashcards *(S1 + S2 complete, S3 + S4 remaining)*

Source doc: `docs/Recall_Study_Modes.md`

- [x] **S1** — Flashcard decks + cards DB tables (deck/card schemas, `flashcardsDb.js`, user-scoped queries) — (pre-tracker) (CC)
- [x] **S2** — Flashcard generation + SM-2 review services (`flashcardGenerator.js`, `flashcardReview.js`) — DONE (implicit; required for Match It which ships from DeckPage and pulls cards from decks ≥4) (CC)
- [ ] **S3** — Flashcard API + UI (endpoints, FlashcardsScreen, DeckScreen, ReviewSessionScreen, Study tab three-button landing) — *Note: DeckPage clearly exists (Match It launches from it). Audit what's actually shipped vs. spec'd before re-running S3.* (CC)
- [ ] **S4** — Study Guide (DB + service + API + screen, "Read the study guide" recovery prompt from low quiz scores) (CC)

## Phase 4 — Lenient grading

Source doc: `docs/Recall_Grading_Fix.md`

- [ ] **G1** — Lenient short-answer grading with partial credit (0 / 0.5 / 1 scoring, lenient grading rubric, modelAnswer surfaced on result screen, mastery treats 0.5 as partial) (CC)

## Phase 4.5 — UX polish & engagement

Drop-in improvements that don't belong to a feature phase. New items land here as they come up.

- [x] Edit-row mobile overflow fix — color wheel + name input + Save/Cancel/Delete wrap; input has `min-width: 60px` so delete never falls off the edge — DONE 2026-06-21 (CC)
- [x] Streak nudge banner on HomePage — warm amber banner when you have an active streak but haven't studied today; auto-dismisses once you complete anything that updates the streak; "Study now" → `/progress` — DONE 2026-06-21 (CC)
- [x] Focus Quiz picker on ProgressPage — courses with any topic below 70% mastery get a "Focus Quiz ▾" button that expands inline to pick a unit; fires a 10-question quiz with 100% review mix from that unit's weakest topics — DONE 2026-06-21 (CC)
- [x] Quiz results "Retake" button — re-generates with the exact same config (unit, count, difficulty, types), counts against the daily cap, inline error if cap is hit; results page now `[↺ Retake] [Back to unit] [Home]` — DONE 2026-06-21 (CC)
- [x] Dynamic `--nav-h` CSS variable — `ResizeObserver` on `<nav>` writes the actual nav height to `:root` so the chat area starts exactly below it (fixes mobile two-row nav overlap from old hardcoded `57px`) — DONE 2026-06-21 (CC)
- [ ] Retake title disambiguation — multiple retakes currently pile up with identical titles in Recent Quizzes. Decide between (a) auto-suffix " (retake)" / " (retake 2)" etc., (b) show attempt number as a small badge, or (c) leave as-is and rely on timestamps. Watch for actual confusion first. (Alex/CC)

## Phase 4.6 — Mini-games *(complete)*

Lightweight study modes built on the existing `questions` table (and flashcard decks for Match It). Live on each unit page under "Quick games" and on DeckPage — no new nav tab.

- [x] Speed Round (`/games/speed-round?unitId=X`) — 3-2-1 countdown, 10 questions, 15s timer bar per question (green → amber → red), auto-advance on answer or timeout, end screen with score + full answer review — DONE 2026-06-21 (CC)
- [x] Streak Challenge (`/games/streak?unitId=X`) — continuous questions, one wrong ends the game, live streak counter in HUD, fetches more on batch exhaustion, end screen with best streak + total answered + contextual message — DONE 2026-06-21 (CC)
- [x] HomePage **Quick Study** section — appears once user has ≥1 completed quiz; two buttons (🏃 Speed Round, 🔥 Streak Challenge) drawing from all courses combined — DONE 2026-06-21 (CC)
- [x] Match It — up to 8 pairs per round from any deck with ≥4 cards, two-column shuffled layout (terms left, definitions right), tap-to-select with green-lock / red-shake feedback, live timer + mistake counter HUD, entry from DeckPage as "Match It 🃏" card — DONE 2026-06-22 (CC)
- [x] Mini-games feed topic mastery — `POST /api/games/results` groups answers by topic+course, computes a quality score, upserts `topic_mastery` via the same SM-2 engine. Both Speed Round and Streak Challenge submit on game-over — DONE 2026-06-22, commit `7fc570f` (CC)
- [ ] **Known limitation:** mini-games draw from completed MCQ questions only — units without MCQ history hit a "not enough questions" error. Either (a) show a clearer empty state with "Generate a quiz with MCQ enabled first," or (b) fall back to true/false if MCQ pool is empty, or (c) nudge MCQ as the default in quiz generation. Pick one before more games ship. (Alex/CC)
- [ ] Streak Challenge can repeat a question within a single long streak (refetches re-randomize, no dedupe). Acceptable for now; revisit if a user reports it. Fix would be a seen-this-session set on the client. (CC)
- [ ] HomePage "Quick Study" shuffle button that randomly picks a mini-game now that 3+ exist (was deferred awaiting this milestone). (CC)

## Phase 5 — Rappel hardening

R1–R5 are merged; this phase covers iteration based on real use.

- [x] Markdown rendering in Rappel chat (bold, italic, lists, code via `react-markdown`) — DONE 2026-06-21 (CC)
- [x] "Get a study plan" entry from QuizResultPage when score < 60% — creates Rappel thread pre-filled with score + missed topics, asks for prioritised plan — DONE 2026-06-21 (CC)
- [x] "Explain it" / Feynman mode from ProgressPage — per-topic button starts Rappel thread running the Feynman technique (you explain, he fills gaps) — DONE 2026-06-21 (CC)
- [x] "Ask Rappel" entry per topic on ProgressPage — DONE 2026-06-21 (CC)
- [x] Tap-to-toggle mic in `ChatThreadPage.jsx` (replaces hold-to-talk): tap once → record + red pulse, live transcription into input, auto-send on silence-detect or second tap, TTS halts on mic tap so Rappel doesn't talk over you, `audio.play().catch()` for graceful autoplay-blocked fallback — DONE 2026-06-22 (CC)
- [x] Mic pulse animation upgraded (`mic-pulse` scale+opacity vs. opacity-only) so recording state is unmistakable — DONE 2026-06-22 (CC)
- [ ] Persona tuning pass after a week of real chats (adjust French frequency, tone, willingness to push back) — based on actual transcripts (Alex/Claude)
- [ ] Voice quality review — pick model (`eleven_turbo_v2_5` vs flash) and stability/similarity settings after listening to real replies (Alex)
- [ ] iOS autoplay watch — current fix relies on the user's tap on Send/mic satisfying the user-gesture requirement. If a friend on iOS reports silent Rappel responses, audit whether the first audio plays without an explicit "tap to play" fallback. Note for later, not a fix-now. (CC)
- [ ] Decide whether voice replies auto-play or require tap (Settings → Studying toggle is in spec — confirm it's wired) (CC)

## Phase 6 — Cost guardrails & observability

You're paying for every Claude + ElevenLabs call. Need to see the spend before it surprises you.

- [x] Token usage logging — every Claude API call (quiz gen, grading, flashcards, study guides, chat) logs to `usage_log` table with user, feature, model, input/output tokens — DONE 2026-06-21 (CC)
- [x] Daily cap audit — single shared bucket confirmed for quiz gen + flashcard gen + study guide gen (chat intentionally excluded — no cap on asking Rappel questions) — DONE 2026-06-21 (CC)
- [x] Owner-only `/admin/usage` page — three tabs (Monthly by user, Daily detail, All users), month picker, estimated $ from Claude pricing table (Haiku $0.80/$4, Sonnet $3/$15, Opus $15/$75 per M tokens in/out). Protected by `ADMIN_USER_IDS` env var (returns 403 to non-admins) — DONE 2026-06-21 (CC)
- [ ] **Setup task:** add your user ID to Railway env var `ADMIN_USER_IDS` (one-time: `SELECT id FROM users WHERE display_name = 'YourName'`, paste the id into Railway) (Alex)
- [ ] ElevenLabs character usage logged alongside Claude tokens (extend `usage_log` or parallel table) — admin page can then show voice spend too (CC)
- [ ] Anthropic billing alert configured outside the app (verify) (Alex)
- [ ] ElevenLabs character-quota alert configured (verify) (Alex)

## Phase 7 — Pre-publish polish *(deferred until production-solid)*

These don't need to happen for you and your friends — they unlock public/paid use.

- [ ] Final tier prices (Plus, Pro) decided (Alex)
- [ ] Stripe integration — checkout, webhook flips `users.tier`, billing portal (CC)
- [ ] Public sign-up (currently owner-gated `POST /api/users`) (CC)
- [ ] Custom domain attached to Railway (Alex)
- [ ] Privacy note final wording in Settings → About (Alex/Claude)
- [ ] Marketing landing page (separate from the app) (CC/Claude)
- [ ] Terms of service + privacy policy (Alex/Claude)

## Phase 8 — Future ideas *(deferred / optional)*

- [ ] Streak + reminder notifications (web push, opt-in)
- [ ] Bulk unit import (multiple files, auto-unit detection)
- [ ] Shareable quiz (export a quiz as a static link)
- [ ] "Teach it back" mode (Feynman-style — Rappel asks you to explain, gives feedback)
- [ ] Mock exam mode (longer, mixed-format, timed, cross-unit)
- [ ] Postgres migration (if user count outgrows SQLite + one Railway service)
- [ ] Per-topic confidence self-ratings to refine SM-2 scheduling
- [ ] Full-duplex voice call mode for Rappel (ElevenLabs Conversational AI / custom LLM endpoint)

---

## Continuous (ongoing, not a phase)

- **Persona tuning.** Read 5–10 real Rappel chats per week, adjust system prompt for things that read off (too French, not enough French, too long, too sycophantic, etc.). (Alex/Claude)
- **Grading rubric calibration.** Spot-check short-answer grading verdicts. If lenient grading drifts too generous or too strict over time, tighten or loosen the rubric prompt. (Alex/CC)
- **Daily cap tuning.** Watch the usage log. If real users bump the cap on normal study days, raise it; if costs spike, lower it. (Alex/CC)
- **Quiz quality eyeballing.** Periodically read a fresh generation cold and ask: are the questions actually grounded in the source, or hallucinated? Are explanations useful? Tweak the generation prompt if patterns emerge. (Alex/Claude)
- **Brand consistency.** When adding new screens or surfaces, reuse the existing components and theme tokens — no one-off colors, no inline hex. (CC)
- **Dependency hygiene.** Skim `npm outdated` once a month; bump security patches, hold off on majors unless something breaks. (CC)

---

## Parking lot — loose ends & decisions

- **App name.** "Recall" is the working name. Worth a quick check that it isn't confusing alongside other study apps before public launch. *(deferred — fine for private)*
- **Theme + colors.** Currently using the indigo/blue brand kit. Locked in unless something looks off in real use.
- **Generation model per tier.** Currently Free → Haiku 4.5, Plus → Sonnet 4.6, Pro → Opus 4.8. All three users are on Free for now — paid tiers don't matter until Phase 7.
- **Final tier prices.** Open. Decide when entering Phase 7.
- **Daily cap exact numbers per tier.** Currently a default; revisit once you can see real token usage in Phase 6's admin page.
- **Source-token budget per tier.** Same as above — tune off real usage.
- **Privacy note exact wording.** Open. Draft when entering Phase 7.
- **Custom domain.** Deferred until production-solid (your call). Railway subdomain is fine until then.
- **Whisper vs ElevenLabs STT.** Using ElevenLabs (one key, one bill). Locked unless transcription quality becomes a real issue.
- **Auto-play voice replies.** Spec says toggle in Settings → Studying, default on. Verify it's actually wired. *(see Phase 5)*
- **Custom Rappel name / persona variations.** Could let users pick a persona later (Italian Marco, British Margaret, etc.). Deferred.

---

## Dead ends & gotchas (don't re-walk these)

- **Vercel can't host Recall** — SQLite needs a real filesystem, Vercel functions are stateless. Railway with a `/data` volume is the only sensible host for this stack. Don't reconsider unless you migrate to Postgres.
- **Railway monorepo trap** — when Railway sees a `client/` + `server/` workspace it tries to split into two services. The right setup is **one** service with **Root Directory blank** (= repo root), so the build runs `npm run build` at the top and produces both client/dist and the server. Delete any auto-created second service.
- **`Missing script: "start"` on first deploy** — root `package.json` needed an explicit `start` script. The fix is `"start": "NODE_ENV=production node server/src/index.js"` at the repo root — direct node invocation, not `npm run start --workspace=...`, so it's independent of the working directory Railway picks.
- **`Cannot GET /` after deploy** — the server was running but not serving the built client. In production the Express app must serve `client/dist` as static files AND have a catch-all route returning `index.html` for any non-`/api` GET. Without this, only `/api/*` responds and the root is a 404.
- **Sign-in refresh loop on Railway** — secure session cookies were being silently rejected because Railway terminates HTTPS at a proxy. Fix is `app.set('trust proxy', 1)` BEFORE the session middleware, plus production cookies set with `secure: true`, `sameSite: 'lax'`, `httpOnly: true`. Without trust-proxy, cookie-session sees HTTP and refuses to set a secure cookie.
- **CSP `default-src 'none'` blocks the app** — a too-strict Helmet config blocked our own scripts, styles, and the data: image PWA icons. The working policy: `default-src 'self'`, `img-src 'self' data: blob:`, `style-src 'self' 'unsafe-inline'`, `worker-src 'self'`, `manifest-src 'self'`, `font-src 'self' data:`.
- **`npm ci` conflicts with Railway's build cache** — `npm ci` always deletes `node_modules` and clashes with how Railway holds `.vite` open between layers. Use `npm install && npm run build` as the Build Command.
- **PowerShell does not speak `&&`** — Railway's Build Command runs on Linux and `&&` is fine there. The same string pasted into a local PowerShell prompt errors with "The token '&&' is not a valid statement separator." Run commands locally one at a time or in bash; let Railway handle the chained build.
- **Port mismatch between domain and app** — Railway assigns a port and the Generate Domain step asks which port to target. The app must listen on `process.env.PORT` (no hardcoded 4000), and the domain target port must match. A common silent failure is "running but unreachable" because the domain points at the wrong port.
- **Browser caches "Cannot GET /" hard.** After fixing the SPA fallback, the old error page can persist in the normal tab for ages. Always hard-refresh in an **incognito window** to verify a fix; trusting your normal browser will burn an hour.
- **Cherry-pick checklist conflicts** — keeping the checklist update in a separate commit on `dev` causes recurring merge conflicts when cherry-picking features to `main`. Bundle the checklist edit into the same commit (or batch) as the feature it stamps. (Codified in marking protocol rule 8.)
- **Status block lying about "next"** — for five consecutive batches the Status said "next: S2" while completely different work shipped each time. The doc is more useful when the next-action line names the thing that will *actually* be done next, not the thing that *should* be next. Keep it honest, even if it means flip-flopping.
