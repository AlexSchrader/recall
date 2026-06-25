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

- **Current phase:** Phase 6 — Cost observability + ongoing hardening
- **In flight:** Nothing open
- **⚡️ Single next action:** Alex to feel-check exam countdown (set an exam date on a course, watch the badge + Progress nudge). Remaining study idea: **Confidence-weighted answers** (touches shared SM-2 — discuss before building). Also queued: study-guide bugfix already shipped; the two Alex-only setup tasks (billing alerts).
- **Last updated:** 2026-06-24 (session — fixed study guide + flashcard `model: Field required` crash; built exam countdown per course)

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
- [x] **S3** — Flashcard API + UI: FlashcardsPage, DeckPage, ReviewPage (flip + Again/Hard/Good/Easy + confetti + session summary + Ask Rappel on weak cards); server routes in `flashcards.js`; UnitPage entry buttons — DONE (confirmed 2026-06-22 audit, shipped pre-tracker) (CC)
- [x] **S4** — Study Guide: StudyGuidePage (generate, display with ReactMarkdown, regenerate, Ask Rappel CTA); server routes in `studyGuides.js`; `pct < 60` recovery banner in QuizResultPage links to study guide + flashcards — DONE (confirmed 2026-06-22 audit, shipped pre-tracker) (CC)

## Phase 4 — Lenient grading

Source doc: `docs/Recall_Grading_Fix.md`

- [x] **G1** — Lenient short-answer grading: `gradeShort` returns 0/0.5/1; lenient system prompt rewards understanding over memorised wording; `~ Partial` badge + modelAnswer shown on result screen; partial count in score summary; mastery uses float score — DONE (confirmed 2026-06-22 audit, shipped pre-tracker) (CC)

## Phase 4.5 — UX polish & engagement

Drop-in improvements that don't belong to a feature phase. New items land here as they come up.

- [x] Edit-row mobile overflow fix — color wheel + name input + Save/Cancel/Delete wrap; input has `min-width: 60px` so delete never falls off the edge — DONE 2026-06-21 (CC)
- [x] Streak nudge banner on HomePage — warm amber banner when you have an active streak but haven't studied today; auto-dismisses once you complete anything that updates the streak; "Study now" → `/progress` — DONE 2026-06-21 (CC)
- [x] Focus Quiz picker on ProgressPage — courses with any topic below 70% mastery get a "Focus Quiz ▾" button that expands inline to pick a unit; fires a 10-question quiz with 100% review mix from that unit's weakest topics — DONE 2026-06-21 (CC)
- [x] Quiz results "Retake" button — re-generates with the exact same config (unit, count, difficulty, types), counts against the daily cap, inline error if cap is hit; results page now `[↺ Retake] [Back to unit] [Home]` — DONE 2026-06-21 (CC)
- [x] Dynamic `--nav-h` CSS variable — `ResizeObserver` on `<nav>` writes the actual nav height to `:root` so the chat area starts exactly below it (fixes mobile two-row nav overlap from old hardcoded `57px`) — DONE 2026-06-21 (CC)
- [x] Retake title disambiguation — retake button strips any existing " (retake)" suffix then appends it, so repeated retakes stay clean instead of stacking — DONE 2026-06-23, commit `576f70a` (CC)

## Phase 4.6 — Mini-games *(complete)*

Lightweight study modes built on the existing `questions` table (and flashcard decks for Match It). Live on each unit page under "Quick games" and on DeckPage — no new nav tab.

- [x] Speed Round (`/games/speed-round?unitId=X`) — 3-2-1 countdown, 10 questions, 15s timer bar per question (green → amber → red), auto-advance on answer or timeout, end screen with score + full answer review — DONE 2026-06-21 (CC)
- [x] Streak Challenge (`/games/streak?unitId=X`) — continuous questions, one wrong ends the game, live streak counter in HUD, fetches more on batch exhaustion, end screen with best streak + total answered + contextual message — DONE 2026-06-21 (CC)
- [x] HomePage **Quick Study** section — appears once user has ≥1 completed quiz; two buttons (🏃 Speed Round, 🔥 Streak Challenge) drawing from all courses combined — DONE 2026-06-21 (CC)
- [x] Match It — up to 8 pairs per round from any deck with ≥4 cards, two-column shuffled layout (terms left, definitions right), tap-to-select with green-lock / red-shake feedback, live timer + mistake counter HUD, entry from DeckPage as "Match It 🃏" card — DONE 2026-06-22 (CC)
- [x] Mini-games feed topic mastery — `POST /api/games/results` groups answers by topic+course, computes a quality score, upserts `topic_mastery` via the same SM-2 engine. Both Speed Round and Streak Challenge submit on game-over — DONE 2026-06-22, commit `7fc570f` (CC)
- [x] **Mini-game empty state:** both Speed Round and Streak Challenge show emoji + bold heading + clear "MCQ first" instruction + "Go generate a quiz →" CTA when unitId is set — DONE 2026-06-23, commit `0c443fc` (CC)
- [x] Streak Challenge no longer repeats a question within a session — client tracks a `seenIds` set, skips already-seen questions in the current batch and filters them out of refetches; if the pool is exhausted mid-streak the game ends on the high note instead of recycling — DONE 2026-06-24 (CC)
- [x] HomePage "Quick Study" shuffle button — "🎲 Surprise me" randomly navigates to Speed Round or Streak Challenge — DONE 2026-06-23, commit `0c443fc` (CC)

## Phase 4.7 — Study-mode expansion & UX polish *(2026-06-25 session)*

New question types, study flows, and a round of mobile UX cleanup. All built CC-side, merged to `main`, client builds green + test suite passing (32 tests).

**Bug fixes**
- [x] Quick Study **0/10 grading bug** — Speed Round + Streak Challenge compared the full option text (`"C) …"`) to `correct_answer` (the letter `"C"`), so every answer was marked wrong. Compare `opt[0]`; also show the full correct answer text in Speed Round results — DONE 2026-06-25, commit `4d196c2` (CC)
- [x] **Crash on quiz submit** — submit handler referenced an undefined `userId` when grading short answers, 500-ing any quiz containing one. Declared it from the session — DONE 2026-06-25, commit `36e5adb` (CC)
- [x] Flashcard **answer readable in dark mode** (back face hardcoded light bg with inherited light text) + joker 🃏 → ⚡️ emoji + theme-aware active nav pill — DONE 2026-06-25, commit `b1ba8e1` (CC)
- [x] Flashcard **long-answer overflow** — flip card now grid-stacks both faces so it grows to fit; `overflow-wrap` stops long words breaking out — DONE 2026-06-25, commit `4dde617` (CC)

**Question types**
- [x] **Multiple-answer ("select all that apply")** — `multi` type end to end: generator emits 2–3 correct letters (`"A,C"`), `gradeMulti` partial credit `(right−wrong)/total` bucketed to 1/0.5/0 (selecting all nets 0), QuizPage checkboxes, type option in UnitPage + Settings; validation tests added — DONE 2026-06-25, commit `36e5adb` (CC)
- [x] **Fill-in-the-blank (cloze)** — `cloze` type: prompt has a `____` blank, deterministic (no-AI) `gradeCloze` normalises case/punctuation/whitespace + forgives a leading article; single-line input; validation requires a blank; tests added — DONE 2026-06-25, commit `5ff8fe9` (CC)

**Study flows**
- [x] **Daily Review** — `/flashcards/daily` reviews due cards across *all* decks (ReviewPage `daily` mode + `GET /flashcards/due`); HomePage shows an "N cards due across your decks" card linking in — DONE 2026-06-25, commit `7be61ba` (CC)
- [x] **Explain it back (active recall)** — QuizResultPage button opens Rappel asking you to explain each topic in your own words and checking you (inverse of the "explain it to me" study plan). Satisfies the Phase 8 "Teach it back" idea — DONE 2026-06-25, commit `7be61ba` (CC)
- [x] **Concise flashcard answers** — generation prompt tightened so backs are gist-level (<~20 words, summarised, no verbatim copying) instead of long passages — DONE 2026-06-25, commit `6d07061` (CC)
- [x] **Regenerate deck button** — `POST /flashcards/decks/:id/regenerate` builds a fresh deck from the same unit (reuses `generateDeck` so the daily cap is enforced + counted), then deletes the old one (new-first, so a failure leaves the original intact). DeckPage button behind a confirm — DONE 2026-06-25, commit `92d7926` (CC)

**Onboarding & nav**
- [x] Onboarding **"Try a card" demo** — zero-cost canned flashcard (reveal + rate) so new users feel the loop before uploading; no AI call — DONE 2026-06-25, commit `e9ad4b1` (CC)
- [x] Onboarding **lands in create-course flow** — finishing routes to `/?start=1`; HomePage opens the new-course form (then clears the flag) — DONE 2026-06-25, commit `dd86e4c` (CC)
- [x] **Mobile top nav cleanup** — two clean rows (account bar: brand · ⚙️ settings · logout; tab bar: Courses · Rappel · Progress · 🔥streak); username collapses to a gear; streak badge moved onto the tab row — DONE 2026-06-25, commits `d4ff633` → `0aa5065` → `bf44f31` (CC)

**Course/unit management**
- [x] **Inline edit unit names** + delete (in edit mode, behind a confirm) on CoursePage, via existing `PUT`/`DELETE /units/:id` — DONE 2026-06-25, commits `1481967`, `bbbbcb7` (CC)
- [x] **Tap-to-select edit pencils** — course + unit rows reveal their ✏️ only when selected (highlighted), replacing hover-only/always-visible pencils; mobile-friendly, tap the name to open — DONE 2026-06-25, commits `aacf608`, `2690408` (CC)
- [x] Stale `rappel.test.js` fixed — single `VOICE_ID` export was split into `MATHIEU_VOICE_ID`/`JULIETTE_VOICE_ID`; suite back to green — DONE 2026-06-25, commit `7be61ba` (CC)

**Study planning**
- [x] **Exam countdown (per course)** — optional `exam_date` on courses (nullable column, migrated via `PRAGMA table_info`; schema change greenlit by Alex 2026-06-24). CoursePage sets/edits/clears the date and shows a colour-coded countdown badge (far/soon/urgent/past); HomePage course rows show a mini badge; ProgressPage shows an "exam soon" nudge for the soonest exam within 14 days. Server validates `YYYY-MM-DD` or null. Pure date helpers in `client/src/examCountdown.js` with 8 unit tests — DONE 2026-06-24 (CC)

## Phase 5 — Rappel hardening

R1–R5 are merged; this phase covers iteration based on real use.

- [x] Markdown rendering in Rappel chat (bold, italic, lists, code via `react-markdown`) — DONE 2026-06-21 (CC)
- [x] "Get a study plan" entry from QuizResultPage when score < 60% — creates Rappel thread pre-filled with score + missed topics, asks for prioritised plan — DONE 2026-06-21 (CC)
- [x] "Warning band" recovery nudge for QuizResultPage scores 60–80% — blue nudge lists missed topics + "Focus quiz on missed topics →" button (10 questions, reviewMix=1 targeting weak topics); distinct from the <60% orange recovery banner — DONE 2026-06-23, commit `9d2eaa5` (CC)
- [x] "Explain it" / Feynman mode from ProgressPage — per-topic button starts Rappel thread running the Feynman technique (you explain, he fills gaps) — DONE 2026-06-21 (CC)
- [x] "Ask Rappel" entry per topic on ProgressPage — DONE 2026-06-21 (CC)
- [x] Tap-to-toggle mic in `ChatThreadPage.jsx` (replaces hold-to-talk): tap once → record + red pulse, live transcription into input, auto-send on silence-detect or second tap, TTS halts on mic tap so Rappel doesn't talk over you, `audio.play().catch()` for graceful autoplay-blocked fallback — DONE 2026-06-22 (CC)
- [x] Mic pulse animation upgraded (`mic-pulse` scale+opacity vs. opacity-only) so recording state is unmistakable — DONE 2026-06-22 (CC)
- [ ] Persona tuning pass after a week of real chats (adjust French frequency, tone, willingness to push back) — based on actual transcripts (Alex/Claude)
- [ ] Voice quality review — pick model (`eleven_turbo_v2_5` vs flash) and stability/similarity settings after listening to real replies (Alex)
- [ ] iOS autoplay watch — current fix relies on the user's tap on Send/mic satisfying the user-gesture requirement. If a friend on iOS reports silent Rappel responses, audit whether the first audio plays without an explicit "tap to play" fallback. Note for later, not a fix-now. (CC)
- [x] Voice auto-play toggle: Settings → Studying section writes `voiceAutoPlay` to `/preferences` on change; ChatThreadPage reads it on mount and sets `voiceEnabled`; `playTTS` gates on `voiceEnabled`; per-session 🔊 button overrides without touching saved pref — DONE (confirmed 2026-06-22 audit, shipped pre-tracker) (CC)
- [x] Voice preview in Settings — clicking Mathieu or Juliette plays the intro clip via `GET /api/voice/preview`; 🔊 indicator + "Playing preview…" hint while audio plays; stops if you click the other voice — DONE 2026-06-23 (CC)
- [x] Review mix slider in Settings → Studying preferences — 0–50% range, saves to `/preferences`, UnitPage reads it on mount so the quiz form defaults to the saved value — DONE 2026-06-23 (CC)
- [x] Dark mode input text fix — `color: var(--text)` added to `.form-group` inputs/textareas, `.chat-input`, `.edit-inline-input`, `.pin-input`; was rendering black text on dark surface — DONE 2026-06-23, commit `576f70a` (CC)
- [x] Screenshot storage in feedback — `screenshot TEXT` column added to feedback table via migration; route now persists base64; admin Feedback tab renders the image inline — DONE 2026-06-23, commit `576f70a` (CC)
- [x] Feedback → email → GitHub pipeline — in-app feedback hits Resend (`RESEND_API_KEY` in Railway), lands in `recallstudyapp.support@gmail.com`; Google Apps Script polls every 5min and opens GitHub issues with `bug`/`enhancement`/`feedback` label; script lives in the support Google account — DONE 2026-06-23 (Alex/CC)

## Phase 6 — Cost guardrails & observability

You're paying for every Claude + ElevenLabs call. Need to see the spend before it surprises you.

- [x] Token usage logging — every Claude API call (quiz gen, grading, flashcards, study guides, chat) logs to `usage_log` table with user, feature, model, input/output tokens — DONE 2026-06-21 (CC)
- [x] Daily cap audit — single shared bucket confirmed for quiz gen + flashcard gen + study guide gen (chat intentionally excluded — no cap on asking Rappel questions) — DONE 2026-06-21 (CC)
- [x] Owner-only `/admin/usage` page — three tabs (Monthly by user, Daily detail, All users), month picker, estimated $ from Claude pricing table (Haiku $0.80/$4, Sonnet $3/$15, Opus $15/$75 per M tokens in/out). Protected by `ADMIN_USER_IDS` env var (returns 403 to non-admins) — DONE 2026-06-21 (CC)
- [x] Admin PIN gate — `/admin` shows a lock screen on every new session; enter `VOICE_PIN` to unlock; all admin data routes require `req.session.adminUnlocked`; non-admins still can't get past `requireAdmin` regardless — DONE 2026-06-23 (CC)
- [x] Admin Feedback tab — lists all in-app feedback submissions with type badge, submitter, date, message, and inline screenshot (base64); each item has "Open as GitHub issue →" link pre-filled with title + body + label — DONE 2026-06-23 (CC)
- [x] Admin delete user — Users tab has per-row Delete button with inline confirm; `DELETE /api/admin/users/:id` kills active sessions then cascades-deletes all user data; self-delete blocked server-side — DONE 2026-06-23 (CC)
- [x] **Setup task:** `ADMIN_USER_IDS` set in Railway — Alex confirmed 2026-06-24 (Alex)
- [x] ElevenLabs character usage logged — TTS calls log to `usage_log` with `feature='tts'`, `model='eleven_turbo_v2_5'`, `output_tokens=char_count`; admin pricing table includes ElevenLabs at $500/1M chars; admin feature label shows 'Voice (chars)' — DONE 2026-06-23, commit `576f70a` (CC)
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
- [x] "Teach it back" mode (Feynman-style — Rappel asks you to explain, gives feedback) — DONE 2026-06-25 as "Explain it back" on QuizResultPage, commit `7be61ba` (CC)
- [ ] Mock exam mode (longer, mixed-format, timed, cross-unit)
- [ ] **Exam countdown** — set a target date on a course; front-load weak topics as it approaches. *Needs a schema change (`exam_date` on courses) — awaiting Alex's go-ahead.* (CC)
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
