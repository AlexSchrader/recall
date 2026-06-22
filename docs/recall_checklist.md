# Recall — Build Checklist & Progress Tracker

A living document. Lives in the repo at `/docs/recall_checklist.md`. **Claude Code maintains it** — every time work finishes, CC stamps the relevant item and updates the Status block.

---

## How to use this doc — READ FIRST

**For me (resuming after a break):**
1. Read **Status at a glance** below.
2. Jump to the first `[ ]` item in the **current phase**. That's your next action.
3. If everything in the current phase is `[x]`, the next phase's first `[ ]` is the next action.
4. Skim the **Parking lot** for decisions you still owe yourself.

**For Claude Code (maintaining this doc):**

When a task finishes, you MUST:

1. Change `[ ]` to `[x]`.
2. Append ` — DONE <YYYY-MM-DD>, commit <sha>` (or PR # if a PR was opened).
3. If the work surfaced follow-ups, add them as new `[ ]` items in the right phase with a one-line "why".
4. Update the **Status at a glance** block (current phase, in-flight item, next action, last updated).
5. **Never delete a completed task.** Checked items stay in place — they are the project's memory.
6. Use `[~]` with ` — STARTED <date>` when work is open but not yet committed. Flip to `[x]` only when landed on `main`.
7. If a task changes scope mid-flight, do NOT silently rewrite it — add a sub-bullet noting the change and why.

---

## Status at a glance

- **Current phase:** Phase 4.6 — Mini-games (in progress)
- **In flight:** Nothing open right now
- **Next action:** Match It game (Phase 4.6), or retake title disambiguation (Phase 4.5), or Phase 7 pre-publish prep
- **Last updated:** 2026-06-21 (post-ship: retake button, Quick Study on HomePage, onboarding flow, voice picker, Speed Round, Streak Challenge)

---

## Legend

- `[ ]` todo
- `[~]` in progress (not yet committed)
- `[x]` done (stamped with date + commit)

---

## Phase 0 — Foundation *(complete)*

- [x] Monorepo scaffold (client + server workspaces, Vite + Express) — DONE (pre-tracker)
- [x] SQLite schema + query layer (users, courses, units, documents, quizzes, questions, attempts, topic_mastery, preferences) — DONE (pre-tracker)
- [x] Tier config + Claude API client wrapper — DONE (pre-tracker)
- [x] Document ingestion (PDF, DOCX, TXT, Markdown, image) + chunked source context — DONE (pre-tracker)
- [x] Quiz generation engine (Claude, MCQ + true/false + short answer) — DONE (pre-tracker)
- [x] Auto-grading (exact match + Claude-assisted for short answers) — DONE (pre-tracker)
- [x] SM-2 spaced repetition — weak topics surface in future quizzes — DONE (pre-tracker)
- [x] Quiz player + result screen with per-question breakdown — DONE (pre-tracker)

## Phase 1 — Auth & Sessions *(complete)*

- [x] Display name + email register; login by display name OR email — DONE (pre-tracker)
- [x] Password reset via Resend email — DONE (pre-tracker)
- [x] Persistent SQLite session store (survives Railway redeploys) — DONE (pre-tracker)
- [x] Trust-proxy + secure cookie config for Railway HTTPS — DONE (pre-tracker)

## Phase 2 — UI shell, branding, deploy *(complete)*

- [x] Onboarding empty state for new users — DONE (pre-tracker)
- [x] Course creation with Open Library textbook search — DONE (pre-tracker)
- [x] Inline course rename + delete — DONE (pre-tracker)
- [x] Sticky nav, fixed chat layout — DONE (pre-tracker)
- [x] Courses + Rappel tabs in nav — DONE (pre-tracker)
- [x] Wikipedia context injection into quiz generation — DONE (pre-tracker)
- [x] Recall brand kit (icons, manifest, lockup on sign-in, CSP image fix) — DONE (pre-tracker)
- [x] Railway single-service deploy (persistent volume at `/data`, SPA fallback, CSP headers, asset caching) — DONE (pre-tracker)

## Phase 3 — Flashcards *(complete)*

Source doc: `docs/Recall_Study_Modes.md`

- [x] **S1** — Flashcard decks + cards DB tables (`flashcardsDb.js`, user-scoped queries) — DONE 2026-06-21, commit fc8600e
- [x] **S2** — Flashcard generation + SM-2 review services (`flashcardGenerator.js`, `flashcardReview.js`) — DONE 2026-06-21
- [x] **S3** — Flashcard API + UI (endpoints, FlashcardsPage, DeckPage, ReviewPage, Study tab) — DONE 2026-06-21, commit c9ca8ce
- [x] **S4** — Study Guide (DB + service + API + StudyGuidePage, recovery prompt on low quiz scores) — DONE 2026-06-21, commit 054b8f1

## Phase 4 — Lenient grading *(complete)*

Source doc: `docs/Recall_Grading_Fix.md`

- [x] **G1** — Lenient short-answer grading with partial credit (0 / 0.5 / 1 scoring, lenient rubric, modelAnswer surfaced on result screen, mastery treats partial as float) — DONE 2026-06-21, commit 8c36d10

## Phase 4.5 — UX polish & engagement *(ongoing)*

Drop-in improvements that don't belong to a feature phase. New items land here as they come up.

- [x] Mobile nav overflow — flex-wrap on topnav; nav-links drop to second row on ≤640px — DONE 2026-06-21, commit 631102f
- [x] Edit-row mobile overflow — color wheel + name input + Save/Cancel/Delete wrap via `flex-wrap`; input has `min-width: 60px` so Delete never falls off edge — DONE 2026-06-21, commit ccee55b
- [x] Display name in nav links to Settings — DONE 2026-06-21
- [x] Streak nudge banner on HomePage — amber banner when streak is active but not studied today; "Study now" → /progress — DONE 2026-06-21, commit ccee55b
- [x] Loading skeletons — Progress and Settings pages pulse-animate while fetching; no more blank flash on load — DONE 2026-06-21, commit 2b93c11
- [x] Progress page empty state — "Nothing tracked yet" card with CTA to courses — DONE 2026-06-21, commit 2b93c11
- [x] Focus Quiz picker on ProgressPage — "Focus Quiz ▾" per course; inline unit picker; fires 10-question quiz with reviewMix=1 — DONE 2026-06-21, commit 6a57016
- [x] Question type checkboxes → toggle switches — UnitPage + Settings use pill toggles (label-left/toggle-right); eliminates mobile misalignment — DONE 2026-06-21, commit b213d99
- [x] Question count extended to 30 — UnitPage max raised to 30; Settings picker is 5/10/15/20/25/30 in a 3-col grid — DONE 2026-06-21, commit d449f48
- [x] CSP: `media-src 'self' blob:` — browser was blocking blob audio URLs (Rappel TTS + game previews) — DONE 2026-06-21, commit 108051e
- [x] `.env.example` updated — added RESEND_API_KEY, VOICE_PIN, ADMIN_USER_IDS with inline instructions — DONE 2026-06-21, commit 2b93c11
- [x] Quiz results: Retake button — re-generates with stored config_json (same unit, count, difficulty, types), counts against daily cap, inline error if cap is hit; buttons now `[↺ Retake] [Back to unit] [Home]` — DONE 2026-06-21, commit 673a6cc
- [ ] Retake title disambiguation — multiple retakes pile up with identical titles in Recent Quizzes. Options: (a) auto-suffix "(retake)", (b) attempt badge, (c) leave as-is. Watch for actual confusion first.
- [ ] Rappel thread auto-title for programmatic entries — "Study plan" and "Explain it" threads should get Claude-generated titles; currently fires on first message in chat route but verify it works for init= flows

## Phase 4.6 — Mini-games *(in progress)*

Lightweight study modes built on the existing `questions` table. Accessible from each unit page under "Quick games" — no new nav tab.

- [x] `GET /api/games/questions` — shuffled MCQ questions from completed quizzes; supports `unitId`, `courseId`, or all-courses fallback — DONE 2026-06-21, commit b3aec82
- [x] Speed Round (`/games/speed-round?unitId=X`) — 3-2-1 countdown, 10 questions, 15s timer bar per question (green → amber → red), auto-advance on answer or timeout, end screen with score + full answer review — DONE 2026-06-21, commit b3aec82
- [x] Streak Challenge (`/games/streak?unitId=X`) — continuous questions, one wrong ends the game, live streak counter in HUD, seamless batch refetch, end screen with best streak + total answered + contextual message — DONE 2026-06-21, commit b3aec82
- [x] HomePage **Quick Study** section — appears once user has ≥1 completed quiz; 🏃 Speed Round + 🔥 Streak Challenge buttons drawing from all courses — DONE 2026-06-21, commit 673a6cc
- [ ] **Known limitation:** games draw from completed MCQ questions only — units without MCQ history hit "not enough questions". Fix: clearer empty state with CTA to generate a quiz with MCQ enabled.
- [ ] Streak Challenge can repeat questions within a long streak (refetch re-randomizes, no dedupe). Acceptable now; fix would be a seen-IDs set on the client.
- [ ] Decide whether mini-game answers update topic mastery. Currently they don't — verify this is intentional. Real retrieval practice should probably count.
- [ ] Match It — tap-pair 8–12 term/definition pairs from a flashcard deck, scored on accuracy + time. Bigger build (new UI component, pairing logic). Parked until after Phase 3 is stable.

## Phase 5 — Rappel hardening *(mostly complete)*

- [x] Markdown rendering in Rappel chat (bold, italic, lists, inline code, blockquote via react-markdown) — DONE 2026-06-21, commit 10d1d4c
- [x] Rappel context upgrade: mastery % per weak topic + top 5 commonly missed questions — DONE 2026-06-21, commit ec27220
- [x] "Ask Rappel" entry points — from ProgressPage per topic, from weak questions list — DONE 2026-06-21, commit ec27220
- [x] "Get a study plan" CTA on QuizResultPage when score < 60% — DONE 2026-06-21, commit ccee55b
- [x] "Explain it" / Feynman mode from ProgressPage — per-topic button starts Rappel thread with Feynman technique — DONE 2026-06-21, commit ccee55b
- [x] Voice auto-play preference — persisted to preferences JSON; toggled in Settings → Studying and per-session via 🔊 button — DONE 2026-06-21
- [x] Mathieu / Juliette voice picker — both voices play Rappel persona; chosen on onboarding step 3 with ▶ preview; changeable in Settings → Studying — DONE 2026-06-21, commit 51957d7
- [ ] Persona tuning pass after a week of real chats (adjust French frequency, tone, willingness to push back) — needs actual transcripts
- [ ] Voice quality review — compare `eleven_turbo_v2_5` vs flash; tune stability/similarity after listening to real replies

## Phase 6 — Settings, progress & cost guardrails *(mostly complete)*

- [x] Settings page: dark/light mode, change display name, email, passphrase, delete quizzes, delete account — DONE 2026-06-21, commit 85157c1
- [x] Study preferences (default quiz length/difficulty/types) saved per user, pre-fill quiz form — DONE 2026-06-21, commit ec27220
- [x] Stats card: quizzes completed, questions answered, cards reviewed, streak 🔥, best streak — DONE 2026-06-21, commit ec27220
- [x] Progress page: mastery bars per course/topic, commonly missed questions, Ask Rappel + Explain It shortcuts — DONE 2026-06-21, commit ec27220
- [x] In-app feedback form (/feedback): type selector, message, screenshot upload/drag/paste, client-side compression — DONE 2026-06-21, commit 631102f
- [x] Token usage logging — `usage_log` table; every Claude call logs feature + model + token counts — DONE 2026-06-21, commit ccee55b
- [x] ElevenLabs character usage logged — TTS route logs `feature: 'tts'`, `outputTokens = text.length` — DONE 2026-06-21
- [x] Per-user daily generation cap verified — quiz + flashcard + study guide share one bucket; chat excluded — DONE 2026-06-21
- [x] Owner-only `/admin/usage` page — daily detail + monthly-by-user + all-users tabs; estimated cost from Claude pricing — DONE 2026-06-21, commit 6a57016
- [x] Export data — `GET /api/me/export` returns full JSON dump; download button in Settings → Studying — DONE 2026-06-21
- [ ] **Setup task:** add your user ID to Railway env var `ADMIN_USER_IDS` (run `fetch('/api/me',{credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.id))` in browser console)
- [ ] Anthropic billing alert configured in Anthropic dashboard (verify)
- [ ] ElevenLabs character-quota alert configured (verify)

## Phase 7 — First-run experience *(complete)*

- [x] 3-step onboarding flow — welcome, how it works, Mathieu/Juliette voice picker; routes outside Layout; AppRoutes gates on `prefs.onboardingDone`; AuthContext fetches prefs alongside user — DONE 2026-06-21, commit 3b430f1
- [x] Voice preview on onboarding — ▶ button on each voice card plays a hardcoded intro via `/api/voice/preview` (no PIN required) — DONE 2026-06-21, commit 51957d7

## Phase 8 — Pre-publish polish *(deferred)*

These don't need to happen for private use — they unlock public/paid launch.

- [ ] Final tier prices (Plus, Pro) decided
- [ ] Stripe integration — checkout, webhook flips `users.tier`, billing portal
- [ ] Public sign-up (currently invite-only)
- [ ] Custom domain attached to Railway
- [ ] Privacy note final wording in Settings → About
- [ ] Marketing landing page (separate from app)
- [ ] Terms of service + privacy policy

## Phase 9 — Future ideas *(deferred / optional)*

- [ ] Mock exam mode (longer, mixed-format, timed, cross-unit)
- [ ] Streak + reminder notifications (web push, opt-in)
- [ ] Bulk unit import (multiple files, auto-unit detection)
- [ ] Shareable quiz (export as static link for friends)
- [ ] Weekly digest email: "Here are your 3 weakest topics this week" (Resend scheduled send)
- [ ] Per-topic confidence self-ratings to refine SM-2 scheduling
- [ ] Full-duplex voice call mode for Rappel (ElevenLabs Conversational AI)
- [ ] Postgres migration if user count outgrows SQLite + single Railway service
- [ ] Sorting Hat mini-game — binary topic-sort; only worth building for courses with clear parallel categories
- [ ] HomePage quick-study shuffle button that randomly picks a game (wait until 3+ games exist)

---

## Continuous

These don't have a "done" state — they're ongoing.

- **Persona tuning.** Read 5–10 real Rappel chats per week; adjust system prompt for anything that reads off.
- **Grading rubric calibration.** Spot-check short-answer grading verdicts. Tighten or loosen rubric prompt if drift appears.
- **Daily cap tuning.** Watch the usage log. Raise if real users bump it on normal study days; lower if costs spike.
- **Quiz quality eyeballing.** Read fresh generations cold — grounded in source or hallucinated? Explanations useful?
- **Brand consistency.** Reuse existing components and theme tokens on all new screens. No one-off hex values.
- **Dependency hygiene.** Skim `npm outdated` once a month; bump security patches, hold off on majors.

---

## Parking lot

Decisions and loose ends to settle before public launch.

- **App name.** "Recall" is the working name. Quick conflict check before public launch — fine for private use now.
- **Theme + colors.** Indigo/blue brand kit. Locked unless something looks off in real use.
- **Generation model per tier.** Free → Haiku 4.5, Plus → Sonnet 4.6, Pro → Opus 4.8. All current users are Free.
- **Daily cap exact numbers per tier.** Currently default; tune off real usage once admin page is showing data.
- **Source-token budget per tier.** Same — tune off real usage.
- **Privacy note exact wording.** Open. Draft when entering Phase 8.
- **Custom domain.** Deferred. Railway subdomain is fine until production-solid.
- **Auto-play voice replies.** Toggle in Settings → Studying, default off. Wired and confirmed working.
- **Custom Rappel persona variations.** Could let users pick Italian Marco, British Margaret, etc. Deferred.

---

*Updated by Claude Code automatically as work lands. If you spot something wrong, tell CC and have it correct the line in place — don't recreate the doc from scratch, the history is the value.*
