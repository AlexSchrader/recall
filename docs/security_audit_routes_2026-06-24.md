# User-scoping audit — `server/src/routes/` (2026-06-24)

**Scope:** every route handler that takes an `:id` parameter or otherwise touches
user-owned data (documents, quizzes, questions, flashcards/decks, chat threads,
study guides, mastery, preferences). For each, verify it (1) requires auth and
(2) confirms the caller owns the resource before reading or mutating it.

**Correct pattern (reference):** `chatDb.js` / `coursesDb.js` — the route calls
`requireAuth`, then every DB statement filters `WHERE ... user_id = ?` (or joins
child→parent→`user_id`). Route-level ownership checks (`row.user_id !== session.userId`)
are equally valid when the DB getter isn't itself scoped.

**Method:** read all 12 route files plus the DB modules they call, to confirm the
`userId` the route passes is actually enforced in SQL (not ignored).

---

## Verdict per file

| File | Auth | Ownership | Verdict |
|------|------|-----------|---------|
| `auth.js` | ✅ | ✅ | **PASS** — all `/me/*` scope by `session.userId`; no cross-user `:id`. |
| `courses.js` | ✅ | ✅ | **PASS** — every course/unit route checks `course.user_id !== session.userId` (units walk unit→course→user). |
| `documents.js` | ✅ | ✅ | **PASS (as of `e99b56a`)** — was the original bug; now `requireAuth` + `ownedUnit` on every route. |
| `quizzes.js` | ✅ | ⚠️ | **GAP** — `POST /quizzes/generate` does not verify the caller owns the `unitIds`/`courseId` it reads source documents from. All other quiz routes PASS. |
| `flashcards.js` | ✅ | ✅ | **PASS** — `ownsUnit` helper + every `flashcardsDb` call is `user_id`-scoped. |
| `studyGuides.js` | ✅ | ✅ | **PASS** — `ownsUnit` guard on both routes. |
| `games.js` | ✅ | ✅ | **PASS** — inline SQL scoped by `qz.user_id = ?` on both read and write. |
| `chat.js` | ✅ | ✅ | **PASS** — reference pattern; every `chatDb` call takes `userId`. |
| `voice.js` | ✅ | ✅ | **PASS** — session-scoped (prefs, PIN); no cross-user `:id`. |
| `preferences.js` | ✅ | ✅ | **PASS** — GET/PUT operate only on `session.userId`. |
| `feedback.js` | ✅ | ✅ | **PASS** — POST scoped to `session.userId`; reads are admin-only. |
| `admin.js` | ✅ | ✅ | **PASS** — intentionally cross-user, gated by `requireAdmin` + `requireAdminPin`. |

DB layer spot-checked: `chatDb.js` and `flashcardsDb.js` filter `user_id` (or join
child→parent→`user_id`) in **every** statement. `coursesDb`/`unitsDb` getters are
unscoped by design, but their routes perform the ownership check before mutating.

---

## Gap found (1)

### `POST /api/quizzes/generate` — cross-user source-content exfiltration

**Severity:** medium-high (private document content leak) · **Blast radius:** low
(3 trusted users; requires knowing/guessing a victim's unit UUID).

The handler requires auth and creates the quiz under the caller's `user_id`, but it
**never checks that the caller owns the `unitIds` / `courseId` in the request body**
before pulling source material:

```js
// server/src/routes/quizzes.js
const { courseId, unitIds, ... } = req.body ?? {};
...
const sourceContext = buildSourceContext(unitIds, sourceTokenBudget);   // ← no ownership check
const unitNames = unitIds.map(id => getUnitById(id)?.name).filter(Boolean);
```

`buildSourceContext(unitIds)` → `listFullDocumentsByUnit(uid)` loads each unit's full
`extracted_text` + image blobs with **no `user_id` filter** (`ingestion/sourceContext.js:74`).
So an authenticated user can pass another user's unit IDs and receive a generated quiz
whose questions are derived from the victim's private documents — then read it back via
`GET /quizzes/:id` (which correctly scopes, but the quiz is now theirs).

**Fix (second commit):** before generation, resolve every `unitId` (and `courseId`)
through the same unit→course→`user_id` ownership check used elsewhere; reject with 404
if any unit isn't owned by the caller. Belongs in the route, mirroring `flashcards.js`
`ownsUnit`.

**Note:** `flashcardGenerator` and `studyGuideGenerator` take a `unitId` too, but their
routes (`flashcards.js`, `studyGuides.js`) already gate on `ownsUnit` before calling — so
quiz generation is the *only* unguarded entry into `buildSourceContext`/`getUnitById`.

---

## Style observation (not a scoping gap)

`games.js` and parts of `auth.js`/`quizzes.js` use inline SQL in the route handler,
against the "no inline SQL in route handlers — queries live in `*Db.js`" convention.
The queries are correctly user-scoped, so this is a tidiness item, not a security one.
Logged here, not fixed.

---

## Root cause of the original `documents.js` bug

Not a missing middleware mount or a bad copy-paste — a **sequencing** problem:

- `documents.js` was created in `67d02c2` **"Stage 5"** (document upload/parsing),
  before any auth existed.
- `requireAuth` was introduced later, in `4a55498` **"Stages 8–12"**, and applied to the
  route files written from that point on.
- The earlier Stage-5 document routes were **never revisited** when auth landed, so they
  silently kept their pre-auth shape (no `requireAuth`, no ownership check) while every
  later file got the pattern.

The quiz-generate gap is a softer version of the same shape: the *route* got `requireAuth`,
but the **body-supplied `unitIds`** were trusted without an ownership check — the input was
treated as already-validated because the surrounding handler looked authenticated.

See the **Dead ends & gotchas** entry in `recall_checklist.md`.
