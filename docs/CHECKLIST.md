# Recall — Build Checklist & Progress Tracker

A living document. Lives in the repo at `/docs/CHECKLIST.md`. **Claude Code maintains it** — every time work finishes, CC stamps the relevant item and updates the Status block.

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
2. Append ` — DONE <YYYY-MM-DD HH:MM local>, commit <sha>` (or PR # if a PR was opened).
3. If the work surfaced follow-ups, add them as new `[ ]` items in the right phase with a one-line "why".
4. Update the **Status at a glance** block (current phase, in-flight item, next action, last updated).
5. **Never delete a completed task.** Checked items stay in place — they are the project's memory.
6. Use `[~]` with ` — STARTED <date>` when work is open but not yet committed. Flip to `[x]` only when landed on `main`.
7. If a task changes scope mid-flight, do NOT silently rewrite it — add a sub-bullet noting the change and why.

---

## Status at a glance

- **Current phase:** Phase 3 — Flashcards
- **In flight:** Nothing open right now
- **Next action:** Run **S4** — Study Guide
- **Last updated:** 2026-06-21

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

- [x] Email + password register/login — DONE (pre-tracker)
- [x] Password reset via Resend email — DONE (pre-tracker)
- [x] Persistent SQLite session store (survives Railway redeploys) — DONE (pre-tracker)
- [x] Trust-proxy + secure cookie config for Railway HTTPS — DONE (pre-tracker)

## Phase 2 — UI shell, branding, deploy *(complete)*

- [x] Onboarding empty state for new users — DONE (pre-tracker)
- [x] Course creation with Open Library textbook search — DONE (pre-tracker)
- [x] Inline course rename + delete — DONE (pre-tracker)
- [x] Sticky nav, fixed chat layout — DONE (pre-tracker)
- [x] Courses + Rappel tabs — DONE (pre-tracker)
- [x] Wikipedia context injection into quiz generation — DONE (pre-tracker)
- [x] Railway single-service deploy (persistent volume at `/data`, SPA fallback, CSP headers, asset caching) — DONE (pre-tracker)

## Phase 3 — Flashcards *(in progress)*

Source doc: `docs/Recall_Study_Modes.md`

- [x] **S1** — Flashcard decks + cards DB tables (`flashcardsDb.js`, user-scoped queries) — DONE 2026-06-21, commit fc8600e
- [x] **S2** — Flashcard generation + SM-2 review services (`flashcardGenerator.js`, `flashcardReview.js`) — DONE 2026-06-21
- [x] **S3** — Flashcard API + UI (endpoints, FlashcardsScreen, DeckScreen, ReviewSessionScreen) — DONE 2026-06-21, commit c9ca8ce
- [ ] **S4** — Study Guide (DB + service + API + screen, "Read the study guide" recovery prompt from low quiz scores)

## Phase 4 — Lenient grading

Source doc: `docs/Recall_Grading_Fix.md`

- [ ] **G1** — Lenient short-answer grading with partial credit (0 / 0.5 / 1 scoring, lenient grading rubric, modelAnswer surfaced on result screen, mastery treats 0.5 as partial)

## Phase 5 — Rappel hardening

R1–R5 are merged; this phase covers iteration based on real use.

- [ ] Persona tuning pass after a week of real chats (adjust French frequency, tone, willingness to push back) — based on actual transcripts
- [ ] Voice quality review — pick model (`eleven_turbo_v2_5` vs flash) and stability/similarity settings after listening to real replies
- [ ] Add "Ask Rappel about this" entry points from UnitScreen and QuizResultScreen if not already present
- [ ] Decide whether voice replies auto-play or require tap (Settings — Studying toggle is in spec — confirm it's wired)

## Phase 6 — Cost guardrails & observability

- [ ] Per-user daily generation cap shared across quizzes, flashcards, study guides, and chat (one bucket) — verify enforced everywhere
- [ ] Token logging per LLM call (model, input tokens, output tokens, user, feature) — written to `usage_log` table
- [ ] Simple admin/owner-only `/admin/usage` page showing per-user daily/monthly spend
- [ ] Anthropic billing alert configured outside the app (verify)
- [ ] ElevenLabs character-quota alert configured (verify)

## Phase 7 — Pre-publish polish *(deferred)*

- [ ] Final tier prices (Plus, Pro) decided
- [ ] Stripe integration — checkout, webhook flips `users.tier`, billing portal
- [ ] Public sign-up
- [ ] Custom domain attached to Railway
- [ ] Privacy note final wording in Settings — About
- [ ] Marketing landing page
- [ ] Terms of service + privacy policy

## Phase 8 — Future ideas *(deferred / optional)*

- [ ] Streak + reminder notifications (web push, opt-in)
- [ ] Bulk unit import (multiple files, auto-unit detection)
- [ ] Shareable quiz (export as static link)
- [ ] "Teach it back" mode (Feynman-style — Rappel asks you to explain, gives feedback)
- [ ] Mock exam mode (longer, mixed-format, timed, cross-unit)
- [ ] Postgres migration (if user count outgrows SQLite)
- [ ] Per-topic confidence self-ratings to refine SM-2 scheduling
- [ ] Full-duplex voice call mode for Rappel (ElevenLabs Conversational AI)

---

## Continuous

- **Persona tuning.** Read 5–10 real Rappel chats per week, adjust system prompt for things that read off.
- **Grading rubric calibration.** Spot-check short-answer grading verdicts.
- **Daily cap tuning.** Watch the usage log. Tune caps based on real usage vs cost.
- **Quiz quality eyeballing.** Periodically read a fresh generation cold — are questions grounded in source?
- **Brand consistency.** Reuse existing components and theme tokens on all new screens.
- **Dependency hygiene.** Skim `npm outdated` once a month; bump security patches.

---

## Parking lot

- **App name.** "Recall" is the working name. Check for conflicts before public launch.
- **Theme + colors.** Indigo/blue brand kit. Locked unless something looks off in real use.
- **Generation model per tier.** Free → Haiku 4.5, Plus → Sonnet 4.6, Pro → Opus 4.8.
- **Final tier prices.** Open. Decide in Phase 7.
- **Daily cap exact numbers per tier.** Tune off real usage in Phase 6.
- **Custom domain.** Deferred until production-solid.
- **Auto-play voice replies.** Spec says toggle in Settings — Studying, default on. Verify wired. *(Phase 5)*
- **Custom Rappel persona variations.** Could let users pick persona later. Deferred.

---

*Updated by Claude Code automatically as work lands.*
