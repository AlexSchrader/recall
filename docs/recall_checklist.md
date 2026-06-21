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

- **Current phase:** Phase 6 — Cost guardrails & observability
- **In flight:** Nothing open right now
- **Next action:** Phase 6 — Admin usage page (`/admin/usage`), verify daily cap enforced across all gen types
- **Last updated:** 2026-06-21 (post-ship: Rappel study plan, Feynman mode, streak nudge, token logging, edit-row mobile fix, in-app feedback)

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

- [x] Display name + email register; login by display name OR email — DONE 2026-06-21, commit 2e14c1d
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

- [x] Mobile nav overflow — flex-wrap on topnav; nav-links drop to second row on ≤640px; logout no longer hangs off edge — DONE 2026-06-21, commit 631102f
- [x] Checkbox label misalignment (question types) — `.type-checks` + `.type-check-label` CSS classes fix label drift on mobile in quiz form and Settings — DONE 2026-06-21, commit 631102f
- [x] Display name in nav links to Settings — clicking your name opens Settings — DONE 2026-06-21
- [x] Edit-row mobile overflow — color wheel + name input + Save/Cancel/Delete wrap via `flex-wrap`; input has `min-width: 60px` so Delete never falls off edge — DONE 2026-06-21, commit ccee55b
- [x] Streak nudge banner on HomePage — amber banner when you have an active streak but haven't studied today; links to /progress; disappears once streak updates — DONE 2026-06-21, commit ccee55b

## Phase 5 — Rappel hardening *(mostly complete)*

- [x] Markdown rendering in Rappel chat (bold, italic, lists, inline code, blockquote via react-markdown) — DONE 2026-06-21, commit 10d1d4c
- [x] Rappel context upgrade: mastery % per weak topic + top 5 commonly missed questions with prompt excerpts — DONE 2026-06-21, commit ec27220
- [x] "Ask Rappel" entry points — from ProgressPage per topic, from weak questions list — DONE 2026-06-21, commit ec27220
- [x] "Get a study plan" CTA on QuizResultPage when score < 60% — creates Rappel thread pre-filled with score + missed topics, asks for prioritised plan — DONE 2026-06-21, commit ccee55b
- [x] "Explain it" / Feynman mode from ProgressPage — per-topic button starts Rappel thread running Feynman technique (you explain, Rappel fills gaps) — DONE 2026-06-21, commit ccee55b
- [ ] Persona tuning pass after a week of real chats (adjust French frequency, tone, willingness to push back) — needs actual transcripts to calibrate
- [ ] Voice quality review — compare `eleven_turbo_v2_5` vs flash; tune stability/similarity settings after listening to real replies
- [ ] Decide whether voice replies auto-play or require tap (Settings → Studying toggle — confirm it's wired)

## Phase 6 — Settings, progress & cost guardrails *(in progress)*

- [x] Settings page: dark/light mode toggle, change display name (availability check), email, passphrase, delete quizzes, delete account — DONE 2026-06-21, commit 85157c1
- [x] Study preferences (default quiz length/difficulty/types) saved per user, pre-fill quiz form on load — DONE 2026-06-21, commit ec27220
- [x] Stats card: quizzes completed, questions answered, cards reviewed, streak 🔥, best streak — DONE 2026-06-21, commit ec27220
- [x] Progress page: mastery bars per course/topic, commonly missed questions, Ask Rappel + Explain It shortcuts — DONE 2026-06-21, commit ec27220
- [x] In-app feedback form (/feedback): type selector, message, screenshot upload (file/drag/paste), client-side compression, stored in DB + emailed via Resend — DONE 2026-06-21, commit 631102f
- [x] Token usage logging — `usage_log` table; every Claude API call (quiz gen, grading, flashcards, study guides, chat streaming) logs feature + model + token counts — DONE 2026-06-21, commit ccee55b
- [ ] Focus quiz shortcut — one-click quiz from weak topics only (100% review mix); needs unit picker UX wired on Progress page
- [ ] Per-user daily generation cap verified across all gen types (quiz, flashcard, study guide, chat) — confirm one shared bucket
- [ ] Owner-only `/admin/usage` page — per-user daily/monthly spend (estimated $ from token counts in `usage_log`)
- [ ] ElevenLabs character usage logged alongside Claude tokens (extend `usage_log` or separate table)
- [ ] Anthropic billing alert configured in Anthropic dashboard (outside app — verify it exists)
- [ ] ElevenLabs character-quota alert configured (verify)

## Phase 7 — Pre-publish polish *(deferred)*

These don't need to happen for private use — they unlock public/paid launch.

- [ ] Final tier prices (Plus, Pro) decided
- [ ] Stripe integration — checkout, webhook flips `users.tier`, billing portal
- [ ] Public sign-up (currently invite-only)
- [ ] Custom domain attached to Railway
- [ ] Privacy note final wording in Settings → About
- [ ] Marketing landing page (separate from app)
- [ ] Terms of service + privacy policy

## Phase 8 — Future ideas *(deferred / optional)*

- [ ] Mock exam mode (longer, mixed-format, timed, cross-unit)
- [ ] Streak + reminder notifications (web push, opt-in)
- [ ] Bulk unit import (multiple files, auto-unit detection)
- [ ] Shareable quiz (export as static link for friends)
- [ ] Export data: download all quiz history + flashcard results as JSON
- [ ] Weekly digest email: "Here are your 3 weakest topics this week" (Resend scheduled send)
- [ ] Per-topic confidence self-ratings to refine SM-2 scheduling
- [ ] Full-duplex voice call mode for Rappel (ElevenLabs Conversational AI)
- [ ] Postgres migration if user count outgrows SQLite + single Railway service
- [ ] Custom Rappel persona variations (Italian Marco, British Margaret, etc.)

---

## Continuous

These don't have a "done" state — they're ongoing.

- **Persona tuning.** Read 5–10 real Rappel chats per week; adjust system prompt for anything that reads off (too French, not enough French, too long, too sycophantic).
- **Grading rubric calibration.** Spot-check short-answer grading verdicts. If lenient grading drifts too generous or too strict, tighten or loosen the rubric prompt.
- **Daily cap tuning.** Watch the usage log. If real users bump the cap on normal study days, raise it; if costs spike, lower it.
- **Quiz quality eyeballing.** Periodically read a fresh generation cold — are questions grounded in the source, or hallucinated? Are explanations useful?
- **Brand consistency.** Reuse existing components and theme tokens on all new screens — no one-off colors, no inline hex values.
- **Dependency hygiene.** Skim `npm outdated` once a month; bump security patches, hold off on majors unless something breaks.

---

## Parking lot

Decisions and loose ends to settle before public launch.

- **App name.** "Recall" is the working name. Quick check for conflicts before public launch is fine — no urgency while private.
- **Theme + colors.** Indigo/blue brand kit. Locked unless something looks off in real use.
- **Generation model per tier.** Free → Haiku 4.5, Plus → Sonnet 4.6, Pro → Opus 4.8. All current users are Free — paid tiers don't matter until Phase 7.
- **Daily cap exact numbers per tier.** Currently a default; revisit once Phase 6 admin page is showing real usage.
- **Source-token budget per tier.** Same — tune off real usage.
- **Privacy note exact wording.** Open. Draft when entering Phase 7.
- **Custom domain.** Deferred until production-solid. Railway subdomain is fine until then.
- **Auto-play voice replies.** Spec says toggle in Settings → Studying, default on. Confirm it's actually wired. *(Phase 5 open item)*
- **Focus quiz unit picker.** Data is ready (mastery by course/topic). Remaining work is UX: how does the user pick which unit to draw questions from? Options: inline dropdown on Progress page, redirect to CoursePage, or first-unit heuristic. *(Phase 6 open item)*

---

*Updated by Claude Code automatically as work lands. If you spot something wrong, tell CC and have it correct the line in place — don't recreate the doc from scratch, the history is the value.*
