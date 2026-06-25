# Recall — Phase 7: Subscriptions, Tiers & Founding Members

A sequenced set of Claude Code prompts to add Stripe-powered subscriptions, real tier enforcement, and the first-10-users founding-member mechanism to Recall. Same pattern as the original build: paste **one prompt at a time**, let CC finish, review the diff, commit, then move to the next.

---

## Before you start

### Decisions locked in
- **Free**: $0 — Haiku 4.5, generous caps, full feature set, no expiring data
- **Plus**: **$3.99/mo or $29/year** — Sonnet 4.6, higher caps, export, longer voice
- **Pro**: **$7.99/mo or $59/year** — Opus 4.8, highest caps, priority generation, unlimited voice
- **Founding members**: first 10 users to sign up after `LAUNCH_DATE` get **lifetime Pro**, automatically flagged, never downgraded

### What you need before any prompts run

1. **Stripe account.** Sign up at stripe.com. Verify your identity (takes ~10 minutes for the basic info).
2. **Stripe products + prices created in the Stripe dashboard** — do this manually before P3, easier than coding it:
   - Product: "Recall Plus" with two prices ($3.99/mo, $29/yr)
   - Product: "Recall Pro" with two prices ($7.99/mo, $59/yr)
   - Note the Price IDs (start with `price_...`)
3. **Stripe webhook signing secret** — created in the dashboard when you add the webhook endpoint. Get this *after* P3 (you'll add the webhook pointing at Railway).
4. **Railway env vars to add when prompted:**
   - `STRIPE_SECRET_KEY` — from Stripe dashboard
   - `STRIPE_WEBHOOK_SECRET` — from the webhook endpoint config
   - `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PLUS_YEARLY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` — the four Price IDs
   - `LAUNCH_DATE` — ISO timestamp of when you consider Recall "live" (founding-member countdown starts here)
   - `FOUNDING_MEMBER_LIMIT=10`

---

## Prompt P1 — DB schema for subscriptions, tiers, and founding members

```
Extend the database to track Stripe subscriptions, tier history, and founding-member status. All migrations idempotent (run on every boot, do nothing if already applied).

1. Extend the `users` table with these columns (ALTER TABLE … ADD COLUMN IF NOT EXISTS):
   - stripe_customer_id TEXT NULL                  -- set when user first checks out
   - subscription_id TEXT NULL                     -- current active subscription
   - subscription_status TEXT NULL                 -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null (free)
   - subscription_current_period_end TEXT NULL     -- ISO timestamp
   - subscription_cancel_at_period_end INTEGER NOT NULL DEFAULT 0
   - founding_member INTEGER NOT NULL DEFAULT 0    -- 1 = lifetime Pro, never downgrade
   - grace_period_until TEXT NULL                  -- if payment fails, user stays on tier until this date

   (`tier` already exists from earlier work — leave it.)

2. New table `subscription_events` — append-only log of every Stripe webhook received:
   id TEXT PRIMARY KEY,
   user_id TEXT NULL REFERENCES users(id),     -- nullable; some events arrive before we map them
   stripe_event_id TEXT NOT NULL UNIQUE,        -- idempotency key — duplicate webhooks are no-ops
   event_type TEXT NOT NULL,                    -- 'checkout.session.completed', 'customer.subscription.updated', etc.
   stripe_object_id TEXT NULL,                  -- the sub/customer/invoice id this event refers to
   payload_json TEXT NOT NULL,                  -- raw event JSON for forensics
   processed_at TEXT NULL,                      -- null until handler runs; non-null = "we acted on this"
   created_at TEXT NOT NULL

3. Add `server/src/db/subscriptionsDb.js` with:
   - getEventByStripeId(stripeEventId)            -- for idempotency checks
   - insertEvent({ userId, stripeEventId, eventType, stripeObjectId, payloadJson })
   - markEventProcessed(id)
   - findUserByStripeCustomerId(customerId)
   - updateUserSubscription(userId, { stripeCustomerId?, subscriptionId?, status?, currentPeriodEnd?, cancelAtPeriodEnd?, tier?, gracePeriodUntil? })
   - countFoundingMembersClaimed()                -- COUNT(*) WHERE founding_member = 1
   - markFoundingMember(userId)                   -- sets founding_member=1, tier='pro'

4. All queries strictly scope by user_id where applicable. Follow the existing pattern in coursesDb.js.

5. Add a tiny test confirming the schema migration runs cleanly twice in a row (idempotency).

Do NOT add Stripe SDK calls or routes yet — schema only.

Commit as feat(db): subscriptions, founding members, event log.
```

**After P1:** restart locally, verify migrations run silently. The new columns + table exist; nothing is using them yet.

---

## Prompt P2 — Tier config, founding-member logic, grace period

```
Update tier resolution so it accounts for founding members, subscription status, and grace periods. This is the core "who is on what tier right now" logic.

1. `server/src/config/tiers.js` — confirm the three tiers exist (free/plus/pro) and add per-tier limits per the gating table:

   free: { generationModel: 'claude-haiku-4-5', dailyGenerationCap: 5, sourceTokenBudget: 8000, voiceMinutesPerDay: 5, maxActiveDocuments: 25, exportAllowed: false, bulkImportMax: 5, mockExamPerMonth: 1, priorityGeneration: false }
   plus: { generationModel: 'claude-sonnet-4-6', dailyGenerationCap: 25, sourceTokenBudget: 16000, voiceMinutesPerDay: 30, maxActiveDocuments: 200, exportAllowed: true, bulkImportMax: 25, mockExamPerMonth: null, priorityGeneration: false }
   pro: { generationModel: 'claude-opus-4-8', dailyGenerationCap: 100, sourceTokenBudget: 32000, voiceMinutesPerDay: null, maxActiveDocuments: null, exportAllowed: true, bulkImportMax: null, mockExamPerMonth: null, priorityGeneration: true }

   (null = unlimited. Grading is always Haiku across all tiers — that stays.)

2. New module `server/src/services/tier.js` exporting:
   - resolveEffectiveTier(user)  — returns 'free' | 'plus' | 'pro'.
       Logic, in this exact order:
       a. If user.founding_member is 1, return 'pro'. (Founding members never downgrade.)
       b. If user.subscription_status is 'active' or 'trialing', return user.tier.
       c. If user.grace_period_until is set and > now, return user.tier. (Card failed, user keeps tier briefly.)
       d. Otherwise return 'free'.
   - tierLimits(user)  — returns the tier config for the effective tier.
   - canAffordOp(user, op) — checks the daily/monthly cap for a given op type ('generation', 'voice_minutes', 'mock_exam', 'export', etc.) against usage_log + tierLimits. Returns { allowed: bool, reason?: string, currentUsage: number, limit: number | null }.

3. All places in the codebase that currently read `user.tier` directly to choose a model or cap should be updated to read through `resolveEffectiveTier(user)` and `tierLimits(user)` instead. Specifically:
   - claude.js (model selection)
   - the daily-cap check before quiz/flashcard/study-guide generation
   - any voice/export/bulk-import code

   This is a refactor pass; behavior should be unchanged for users whose tier already equals their effective tier. Run the supertest harness — all 84 tests must still pass.

4. Add new harness tests:
   - founding_member=1 + tier='free' — effective tier = pro
   - tier='plus' + subscription_status='canceled' + grace_period_until in past — effective tier = free
   - tier='plus' + subscription_status='canceled' + grace_period_until in future — effective tier = plus
   - tier='plus' + subscription_status='active' — effective tier = plus

5. Do not touch Stripe yet. This prompt is logic-only.

Commit as feat(tier): effective-tier resolver with founding-member and grace-period rules.
```

**After P2:** the app behaves the same as before for current users, but the *machinery* for tier overrides is in place. The harness should still be 84 green.

---

## Prompt P3 — Stripe Checkout, webhook handler, billing portal

```
Wire up Stripe Checkout for new subscriptions, the webhook handler for status changes, and the customer portal for self-service. All Stripe interactions live behind a single service so they can be mocked in tests.

1. Install: `stripe` (latest). Add to package.json.

2. Env vars (read once at boot, fail-fast if missing in production):
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - STRIPE_PRICE_PLUS_MONTHLY, STRIPE_PRICE_PLUS_YEARLY
   - STRIPE_PRICE_PRO_MONTHLY,  STRIPE_PRICE_PRO_YEARLY
   - APP_URL (e.g. https://recall.app — used for success/cancel redirects)

3. `server/src/services/stripe.js` wrapping the Stripe SDK:
   - createCheckoutSession({ user, priceId, successUrl, cancelUrl }) — returns { url } to redirect the browser. Creates or reuses the Stripe Customer for this user (stored on user.stripe_customer_id).
   - createPortalSession({ user, returnUrl }) — returns { url } to send the user to Stripe's hosted billing portal.
   - constructWebhookEvent(rawBody, signature) — uses STRIPE_WEBHOOK_SECRET to verify and parse.
   - resolvePriceIdToTier(priceId) — 'plus' | 'pro' based on the env Price IDs. Throw if unknown.

4. New routes in `server/src/routes/billing.js` (mounted at /api/billing, all requireAuth EXCEPT the webhook):

   POST /api/billing/checkout
     body: { plan: 'plus' | 'pro', cycle: 'monthly' | 'yearly' }
     — resolves to the right STRIPE_PRICE_*; calls createCheckoutSession; returns { url }.
     — Founding members get a 409 with message "You're already a founding member — Pro is yours for life." (Don't let them accidentally pay.)

   POST /api/billing/portal
     body: {} — calls createPortalSession; returns { url }.
     — 404 if user has no stripe_customer_id (they've never subscribed).

   POST /api/webhook/stripe       — raw body, no JSON parsing, no auth
     — verify signature via constructWebhookEvent
     — log every event to subscription_events
     — idempotency: if stripe_event_id already exists in subscription_events with processed_at NOT NULL, return 200 immediately without re-processing
     — handle these event types:
         - 'checkout.session.completed' — find user by customer id (or by client_reference_id = user id passed at checkout creation); set stripe_customer_id, subscription_id, status='active', current_period_end, tier from price id
         - 'customer.subscription.updated' — update status, current_period_end, cancel_at_period_end; if tier changed (upgrade/downgrade), update tier; if status moves to 'past_due', set grace_period_until = now + 3 days
         - 'customer.subscription.deleted' — set status='canceled', leave tier as-is; resolveEffectiveTier will drop to free once grace expires (or immediately if no grace was set)
         - 'invoice.payment_succeeded' — clear grace_period_until if set
         - 'invoice.payment_failed' — set grace_period_until = now + 3 days; status='past_due'
     — mark processed_at on the event row at the end
     — return 200 even if the user can't be resolved (log + return 200 — Stripe retries 4xx/5xx forever)

5. Express setup: the webhook route needs the raw body to verify the signature. Add a custom middleware that captures rawBody for /api/webhook/stripe BEFORE express.json() parses it. Document this clearly in the file.

6. Add harness tests with the Stripe service mocked at the module boundary:
   - POST /checkout returns a url for a free user
   - POST /checkout returns 409 for a founding member
   - Webhook with bad signature returns 400
   - Webhook with duplicate stripe_event_id returns 200 and does NOT re-process (idempotency)
   - 'checkout.session.completed' upgrades the user to the right tier + status='active'
   - 'invoice.payment_failed' sets grace_period_until 3 days out + status='past_due'
   - 'invoice.payment_succeeded' clears grace_period_until
   - 'customer.subscription.deleted' sets status='canceled' but does NOT immediately drop tier (grace period handles that)

7. **Founding member auto-flag** — modify the user-creation route (POST /api/users) so that AFTER a user is created and BEFORE returning, the server checks:
   - Is process.env.LAUNCH_DATE set, and is the new user's created_at >= LAUNCH_DATE?
   - countFoundingMembersClaimed() < FOUNDING_MEMBER_LIMIT (default 10)?
   - If yes to both: markFoundingMember(newUser.id) and return the user with founding_member=1 set.
   - Add a harness test for the 11th user creation NOT becoming a founding member.

8. Add a public read-only endpoint GET /api/founding-members/status (no auth) returning { claimed: N, limit: 10 } — used by the landing/sign-in page to show "X of 10 spots claimed."

Commit as feat(billing): Stripe checkout, webhook handler, founding-member auto-flag.
```

**After P3 — important:**

1. Add all the Stripe env vars to Railway.
2. In the Stripe dashboard, add a webhook endpoint pointing at `https://your-railway-url/api/webhook/stripe` and subscribe it to the five event types above. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
3. Set `LAUNCH_DATE` to whatever moment counts as "live" — pick a moment *after* you, your two friends, and any test users were created so they don't take founding-member slots. (Or accept that one of them takes a slot; honestly maybe you should.)
4. Use Stripe's [test mode](https://stripe.com/docs/testing) for everything until you're sure it works. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

---

## Prompt P4 — Cap enforcement + soft-prompt-at-limit UX

```
Make tier limits actually bite, and add the soft-prompt-at-limit UX so hitting a cap feels fair, not punitive.

SERVER:

1. Every place that performs a metered operation must call canAffordOp(user, op) from tier.js BEFORE the work. On false:
   - return HTTP 402 with body { error: 'limit_reached', op, currentUsage, limit, suggestedPlan: 'plus'|'pro' }
   - 402 ("Payment Required") is the right semantic and is rarely used, so the client can detect it reliably
   - DO NOT consume the user's daily cap when returning 402

2. Coverage — these ops are now capped server-side:
   - 'generation' — quiz / flashcard deck / study guide / mock exam (any LLM call that produces durable content); shared bucket, daily reset at midnight UTC
   - 'voice_minutes' — ElevenLabs TTS; tracked in seconds in usage_log, daily reset
   - 'export' — PDF/CSV export endpoints; free users get 402
   - 'bulk_import' — count of files in a single bulk-import request must be ≤ bulkImportMax
   - 'active_documents' — POST document fails with 402 if user is at maxActiveDocuments

3. Suggest the smallest sufficient upgrade: a Free user hitting 'generation' suggests 'plus'; a Plus user hitting it suggests 'pro'.

4. Add harness tests for each cap: at-limit returns 402 with the right body shape; below-limit returns 200; the 402 path does NOT increment usage_log.

CLIENT:

5. New top-level component `<LimitPrompt />` rendered globally via context. The api wrapper (client/src/api.js) detects 402 responses with body.error === 'limit_reached' and dispatches an event the LimitPrompt listens for.

6. The LimitPrompt is a centered modal (or bottom sheet on mobile) with:
   - Friendly headline depending on op: "You've used your 5 quizzes today" / "Voice minutes for today: used up" / etc.
   - One line of body: "Keep going with [Plus / Pro] — [the specific feature in human words]."
   - Primary button: "Upgrade to [Plan] — $X.XX/mo" — fires POST /api/billing/checkout and redirects to the Stripe URL.
   - Secondary link: "Maybe tomorrow" — dismisses.
   - Tertiary link: "See all plans" — /settings/upgrade.

7. Tone rules for the copy (apply across all LimitPrompt variants):
   - No guilt language. Never "you've hit your limit" — say "you've used your X today."
   - No FOMO. Don't say "only X spots left" or count down.
   - Always offer a graceful "tomorrow" path.
   - Founding members should NEVER see a LimitPrompt for caps they don't actually hit (founding=Pro caps).

8. Add a /settings/upgrade page (UpgradePage.jsx) showing the three tiers side-by-side with the gating table content. Each paid tier has monthly/yearly toggle and a single "Subscribe" button — /api/billing/checkout. The user's current tier is visually marked. Founding members see a permanent "Founding member — Pro for life ✨" instead of upgrade buttons.

9. Add /settings/billing entry — POST /api/billing/portal — redirect to Stripe's portal. Hide it for users with no stripe_customer_id (free users who've never subscribed).

10. Settings tab gets two new rows: "Plan & limits" (→ UpgradePage) and "Manage billing" (→ portal). "Plan & limits" shows the user's effective tier and a small "X / Y used today" summary for the main caps.

Commit as feat(tier): cap enforcement + upgrade UX.
```

**After P4:** every limit in the gating table is enforced on the server and surfaced gracefully on the client. The app is now monetizable. Free users feel limits at the right moments; paid users feel value; founding members feel special.

---

## Prompt P5 — Landing page + founding-member counter + first-time install nudge

```
Add the public-facing surfaces that turn the sign-in screen into a real landing page, show the founding-member counter, and nudge mobile installs.

1. Refactor the existing sign-in screen into LandingPage.jsx that shows:
   - Recall lockup + one-line value prop: "Quizzes built from your own material, tuned to how you study."
   - Three short feature blocks: "Your material → real questions" / "Adapts to your weak spots" / "Talk to Rappel, your French study tutor."
   - **The founding-member counter** — fetches GET /api/founding-members/status:
       - If claimed < limit: large badge "🌟 X of 10 founding spots claimed — lifetime Pro for early supporters"
       - If claimed >= limit: small line "Founding 10 are claimed — thanks 🙏" (no urgency manipulation; just acknowledgement)
   - Sign-in + Create-account forms, same as today.
   - Three-tier pricing snippet below the fold (link to /pricing for full detail).

2. New PricingPage.jsx at /pricing — the same three-tier comparison the upgrade page uses, but public (no auth required). Footer links to it.

3. "Install on iPhone" inline help — if the client detects iOS Safari AND the app is NOT already installed (display-mode: standalone), show a small dismissible card on first visit explaining the Share → Add to Home Screen steps. Persist dismissal in localStorage.

4. Beforeinstallprompt nudge for desktop / Android — capture the `beforeinstallprompt` event, stash the deferred prompt, and surface a small "Install Recall" button in the header. On click, fire the deferred prompt. Hide once display-mode becomes standalone.

5. Footer with: Pricing · Privacy · Terms · "Made by [Alex]" link.

6. Privacy + Terms pages — placeholder MD-rendered pages with the actual current data-handling story (data lives in our DB on Railway, chats and uploads go to Anthropic for processing, voice goes to ElevenLabs, no analytics, no third-party trackers, you can delete your account anytime via Settings → Account). Real ToS draft is a Phase 7 followup; placeholder is fine for now.

Commit as feat(landing): public landing, pricing page, founding-member counter, install nudges.
```

**After P5:** Recall is publicly presentable. Anyone hitting your domain sees a real product, can see how many founding spots are left, and can sign up cleanly.

---

## What's NOT in this phase (intentionally deferred)

- **Annual prorating + plan switching mid-cycle.** Stripe handles this automatically through the portal — users can upgrade/downgrade themselves there. We don't need custom UI for it.
- **Coupons / referral codes.** Stripe has native coupons; add when you actually want a promo.
- **Team / family plans.** Not requested. Skip unless asked.
- **Sales tax / VAT.** Real but not urgent. Stripe Tax handles this with a checkbox; turn it on when you're ready to handle international customers.
- **Email receipts.** Stripe sends these by default.

---

## After all 5 prompts land — owner setup checklist

- [ ] Stripe products + prices created, Price IDs in Railway env vars
- [ ] Stripe webhook configured against `/api/webhook/stripe` with signing secret in env
- [ ] `LAUNCH_DATE` set in Railway to whatever you call "live"
- [ ] `FOUNDING_MEMBER_LIMIT=10` set (or whatever number)
- [ ] Custom domain pointed at Railway, HTTPS green
- [ ] Test mode → live mode flip in Stripe (with one real test purchase from yourself to verify the loop)
- [ ] Sign-in page shows "X of 10 spots claimed"
- [ ] Stripe billing alert configured (email when monthly revenue hits a threshold so you don't have to keep checking)

---

## Notes for future-you

- **Founding members are forever.** Even if you raise prices, even if you change tiers, founding=true keeps them on Pro at $0. That's the point — don't second-guess it later.
- **The grace period is the loyalty feature.** A student whose card fails during finals shouldn't get downgraded mid-quiz. Keep this even if it costs you a few dollars.
- **subscription_events is gold.** Don't truncate it. The first time a customer disputes a charge in 6 months, you'll be glad it's there.
- **Idempotency is non-negotiable.** Every Stripe handler change in the future must preserve the "duplicate stripe_event_id = no-op" check.
