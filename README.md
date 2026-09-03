# Altitude

A trek-booking marketplace built for the **Razorpay Buildathon — AI Growth & Agentic Commerce** track: *"Grow the merchant's revenue, and make them sellable to AI buyers."*

Altitude is a real Node/Express + MongoDB + React marketplace with a Razorpay test-mode payment engine, wrapped by an AI concierge layer. The distinguishing goal of this build isn't the chat widget — it's that **an external AI agent can discover, reserve, and pay for a trek against this merchant with no human in the loop**, gated by the same guardrails and audit trail a human booking goes through.

## The bar this build targets

> Every money action explainable, bounded and gated. Show the audit trail and one failure handled gracefully.

- **Bounded** — every reservation is checked against fitness, add-on-spend cap, and (optionally) budget guardrails *before* a Razorpay order is ever created. Slot reservation is atomic (MongoDB compare-and-swap), so concurrent requests for the last slot can't both succeed. Abandoned checkouts auto-expire and release their slot after 15 minutes.
- **Gated** — no guardrail is advisory. A failed check throws before payment; nothing partial is created.
- **Explainable** — every guardrail decision, every AI reasoning step (signal extraction, trek recommendation, add-on suggestion, campaign nudges), and every payment event is written to a structured, queryable audit log with a per-check trace and a `correlationId` that threads a whole conversation-to-booking chain together.
- **Audit trail** — `GET /api/v1/audit` (raw) and `/admin` in the frontend (visualized, with pass/fail chips per guardrail check).
- **One failure handled gracefully** — see the AI buyer script below; it has a dedicated mode that deliberately trips a guardrail and shows the clean rejection path, end to end.

## Architecture

```
Frontend/ (React 19 + Vite, Tailwind)
  Home -> TrekDetail (browse, batch/add-on selection, Razorpay Checkout.js)
  ConciergePanel (chat widget, wired to the AI layer)
  AdminAudit (audit trail + guardrail-rejection analytics dashboard)

Backend/
  src/                        core marketplace — the source of truth for money actions
    models/                   Trek, Batch, AddOn, Booking, AuditLog
    services/bookingService.js  guardrails -> atomic slot reservation -> Razorpay order -> payment verification
    utils/guardrails.js        fitness / add-on-cap / budget checks + audit logging
    controllers, routes        human-facing REST API
    routes/agentRoutes.js       agent-facing catalog + capability manifest
  Ai/                          AI concierge layer — reuses core services, does not duplicate them
    services/llmService.js      thin client for the LLM (Groq cloud, gpt-oss-20b), timeout/abort handled
    services/extractionService.js    message -> structured signals (difficulty, budget, fitness, booking intent)
    services/retrievalService.js     signals -> matching treks + open batches
    services/recommendationService.js  per-trek natural-language reasoning + one add-on suggestion
    services/conciergeService.js     orchestrates the above; the *only* place chat and booking meet
  scripts/aiBuyerAgent.js      standalone autonomous AI buyer — see below
  openapi.json                 machine-readable API spec
```

Both the human checkout path (`POST /bookings/create`) and the AI-attributed path (`POST /chat/book`) call the **same** `bookingService.processBookingAttempt`, so guardrail enforcement can't drift between "what a human can do" and "what an agent can do." The only difference is the `source` field (`human` vs `agent`) recorded on the booking and in every audit entry it produces.

## Agent-to-agent commerce surface

Everything a third-party AI buyer needs to transact is discoverable from one endpoint:

```
GET /api/v1/agent/catalog
```

Returns products/offers (trek, batch, price, slots, min fitness), the add-on list, a plain-English description of every guardrail that will be evaluated, and a `capabilities` block naming the exact endpoints to call next (`converse`, `reserve`, `pay`, `cancel`, `audit`). A full OpenAPI spec is served at `GET /api/v1/openapi.json`. This isn't a formal ACP/AP2/x402 implementation — it's a pragmatic "discover → structured offer → bounded transact call" surface in that spirit, built to be legible to an agent that has never seen this API before.

### The AI buyer demo (`Backend/scripts/aiBuyerAgent.js`)

A standalone script — not part of the web app — that plays the *buyer* role autonomously against the real running API:

```
discover (GET /agent/catalog)
  -> decide (POST /chat/message — the real Groq-backed pipeline, not a hardcoded picker)
  -> reserve (POST /chat/book — guardrail-gated, source: 'agent')
  -> pay (POST /bookings/confirm — real HMAC-SHA256 signature verification)
  -> confirm (GET /audit — prints the resulting trace)
```

```bash
cd Backend
npm run ai-buyer            # happy path: discovers, books, pays, confirms
npm run ai-buyer:fail       # deliberately fails the fitness guardrail — shows graceful rejection
node scripts/aiBuyerAgent.js --fail=budget   # deliberately fails the budget guardrail
```

**Payment note:** the script has no browser, so it can't drive Razorpay's actual Checkout widget. It exercises the *real* signature-verification code (`POST /bookings/confirm`, HMAC-SHA256 over `order_id|payment_id`) using a payment id it makes up and signs with the test-mode key secret the server already holds for this account. This is a simulated payment-gateway callback for demo purposes, not a live Razorpay transaction — it proves the verification logic end-to-end without needing real card entry. Every other step (catalog discovery, AI recommendation, guardrail evaluation, atomic slot reservation, order creation, audit logging) is real.

## Running it

```bash
# Backend
cd Backend
npm install
cp .env.example .env   # fill in MONGO_URI, RAZORPAY_KEY_ID/SECRET (test mode), GROQ_API_KEY
npm run seed            # seeds 10 treks, batches, add-ons, and a 1-slot-left race-condition fixture
npm run dev              # http://localhost:5000

# Frontend
cd Frontend
npm install
cp .env.example .env    # VITE_RAZORPAY_KEY_ID must match the backend's RAZORPAY_KEY_ID
npm run dev               # http://localhost:5173
```

## How to demo (< 2 minutes)

1. **Human path**: Home → pick a trek → select a batch/add-ons → "Book Now" → Razorpay test card (`4111 1111 1111 1111`, any future expiry/CVV) → confirmed booking → "My Bookings".
2. **Agent path, same UI**: on a trek page, click **"Book with Concierge"** (or ask the chat "book this trek" after it recommends one) — the checkout modal shows a *"Booking via AI Concierge (source: agent)"* badge, and the resulting booking flows through `/chat/book` with its own guardrail trace.
3. **Admin Audit** (`/admin`): shows both `Human (Web)` and `API Agent` entries, revenue/rejection analytics, and a per-check pass/fail trace for every decision — including the AI's own reasoning steps (`signal_extraction`, `trek_recommendation`), not just payment events.
4. **Autonomous AI buyer**: `npm run ai-buyer` in a terminal — narrates discover → decide → reserve → pay → confirm with no browser involved, then `npm run ai-buyer:fail` to show a guardrail rejection handled cleanly (no slot held, no order created, reason printed, audit entry written).
5. **Race safety**: fire two concurrent `POST /bookings/create` requests at `batch_trk_001_race` (seeded with exactly 1 slot left) — exactly one succeeds.

## Guardrails reference

| Guardrail | Enforced in | Behavior |
|---|---|---|
| Fitness | `checkFitness` | Rejects if `customerFitnessLevel < trek.minFitnessLevel` |
| Add-on cap | `checkAddonCap` | Rejects if add-on spend exceeds `ADDON_CAP_PERCENTAGE` (default 25%) of trek base price |
| Budget | `checkBudget` | Rejects if `totalAmount > maxBudget`, when the caller supplies one |
| Slot availability | atomic `findOneAndUpdate` CAS | Race-safe; concurrent last-slot requests can't both succeed |
| Rate limit | `express-rate-limit` on `/chat/*` | 20 req/min/IP, logged to the audit trail |
| Idempotency | `Booking.idempotencyKey` (unique, sparse) | Duplicate requests return the original result instead of double-booking |
| Abandoned checkout | periodic sweep in `server.js` | Releases the slot if payment isn't completed within 15 minutes |

Every row above writes to `AuditLog` with `actor` (`human`/`agent`/`system`), `decision`, `outcome`, a human-readable `reason`, and (where applicable) a per-check `trace[]`.
