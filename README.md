# Altitude

A trek-booking marketplace built for the **Razorpay Buildathon — AI Growth & Agentic Commerce** track: *"Grow the merchant's revenue, and make them sellable to AI buyers."*

Altitude is a real Node/Express + MongoDB + React marketplace with a Razorpay test-mode payment engine, wrapped by an AI concierge ("Altia") that behaves like an actual salesperson — and by a genuine external agent-to-agent commerce surface (REST API + MCP server) that lets an outside AI agent discover, reserve, and pay against this merchant with no access to this codebase.

## The bar this build targets

> Every money action explainable, bounded and gated. Show the audit trail and one failure handled gracefully.

- **Bounded** — every reservation (including group bookings) is checked against fitness, add-on-spend cap, and (optionally) budget guardrails *before* a Razorpay order is ever created. Slot reservation is atomic (MongoDB compare-and-swap, group-size-aware), so concurrent requests for the last slot(s) can't both succeed. Abandoned checkouts auto-expire and release their slot after 15 minutes.
- **Gated** — no guardrail is advisory. A failed check throws before payment; nothing partial is created.
- **Explainable** — every guardrail decision, every AI reasoning step (signal extraction, trek recommendation, add-on suggestion, sales pivots, campaign nudges), and every payment event is written to a structured, queryable audit log with a per-check trace and a `correlationId` that threads a whole conversation-to-booking chain together.
- **Audit trail** — `GET /api/v1/audit` (raw) and `/admin` in the frontend (visualized, with pass/fail chips per guardrail check and a rejection-breakdown chart).
- **One failure handled gracefully** — see the AI buyer script below; it has a dedicated mode that deliberately trips a guardrail and shows the clean rejection path, end to end.
- **Proven, not just claimed** — `npm test` runs 23 automated tests against the real booking engine (guardrails, race safety, group pricing, signature verification) — see [Automated tests](#automated-tests).

## Architecture

```
Frontend/ (React 19 + Vite, Tailwind)
  Home -> TrekDetail (browse, batch/add-on/traveler-count selection, Razorpay Checkout.js)
  ConciergePanel ("Altia" — sales-persona chat widget, wired to the AI layer)
  LiveDemo (/demo — "Watch an AI Buy": runs the buyer scripts server-side, streams real output)
  Admin dashboard (/admin — Overview, Audit Trail, AI Agent Activity, Guardrails & Safety, Catalog)

Backend/
  src/                        core marketplace — the source of truth for money actions
    models/                   Trek, Batch, AddOn, Booking (incl. travelers, contact fields), AuditLog
    services/bookingService.js  guardrails -> atomic slot reservation -> Razorpay order -> payment verification
    services/emailService.js    optional booking-receipt email (deterministic facts, LLM-written note)
    utils/guardrails.js        fitness / add-on-cap / budget checks + audit logging
    utils/crypto.js            constant-time Razorpay signature comparison
    controllers, routes        human-facing REST API
    routes/agentRoutes.js       agent-facing catalog + capability manifest
  Ai/                          AI concierge layer — reuses core services, does not duplicate them
    services/llmService.js      thin client for the LLM (Groq cloud, gpt-oss-20b), timeout/abort handled
    services/extractionService.js    message -> structured signals (difficulty, budget, fitness, travelers, intent)
    services/retrievalService.js     signals -> matching treks (up to 4), or the closest sales-pivot alternative
    services/recommendationService.js  per-trek sales pitch, add-on upsell, and trek-info Q&A
    services/conciergeService.js     orchestrates the above; the *only* place chat and booking meet
  mcp-server/index.js         MCP server — exposes the catalog/concierge/reserve/audit tools over stdio
  scripts/
    aiBuyerAgent.js            standalone autonomous AI buyer (REST) — see below
    mcpBuyerAgent.js           standalone autonomous AI buyer (MCP) — a genuinely separate client
    realPaymentAttempt.js      documented real-browser payment attempt — see "What we learned"
  test/                       automated test suite (node --test)
  openapi.json                 machine-readable API spec
```

Both the human checkout path (`POST /bookings/create`) and the AI-attributed path (`POST /chat/book`) call the **same** `bookingService.processBookingAttempt`, so guardrail enforcement can't drift between "what a human can do" and "what an agent can do." The only difference is the `source` field (`human` vs `agent`) recorded on the booking and in every audit entry it produces.

## Altia — a concierge that sells, not just searches

The chat isn't a search box with a persona painted on it:

- **Never a dead end.** If nothing matches exactly, Altia pivots to the closest alternative and pitches it honestly ("I don't have an exact match for extreme under ₹3,000, but I think you'll love this instead...") rather than returning empty results. The one thing that never bends: the fitness safety guardrail is never relaxed to force a sale.
- **Remembers the conversation.** Preferences (difficulty, budget, month, travelers, contact info) carry across turns — "cheaper please" after "I want an extreme trek" still knows you want extreme.
- **Answers follow-up questions properly.** "Tell me more about this trek" gets a specific answer from real trek data (itinerary, altitude, distance), not a repeat of the same pitch and card.
- **Handles group bookings correctly.** "For 4 people" is extracted, carried through booking, reserves 4 slots atomically, and prices as `perPersonPrice × travelers` — shown transparently, not silently multiplied or ignored.
- **Collects contact info conversationally**, then hands off to Razorpay Checkout with name/email/phone pre-filled — the customer only has to confirm a payment method. This is the furthest a chat assistant can legitimately automate a payment gateway integration: raw card/UPI entry has to happen inside Razorpay's own PCI-DSS-scoped Checkout, never in our UI.

## Agent-to-agent commerce surface

Everything a third-party AI buyer needs to transact is discoverable and callable two ways:

### 1. REST — `GET /api/v1/agent/catalog`

Returns products/offers (trek, batch, price, slots, min fitness), the add-on list, a plain-English description of every guardrail that will be evaluated, and a `capabilities` block naming the exact endpoints to call next (`converse`, `reserve`, `pay`, `cancel`, `audit`). A full OpenAPI spec is served at `GET /api/v1/openapi.json`.

### 2. MCP — `Backend/mcp-server/index.js`

A real [MCP](https://modelcontextprotocol.io) server exposing five tools (`discover_catalog`, `ask_concierge`, `reserve_trek`, `confirm_payment`, `get_audit_trail`) over stdio. This is the proof that the merchant is transactable by an agent that has **never seen this codebase**: any MCP client (Claude Desktop, Claude Code, a custom agent) can connect to it directly. It holds **no Razorpay secret** and cannot fabricate a payment signature — `confirm_payment` only relays proof of a real payment.

```bash
npm run mcp-server     # run standalone, or point an MCP client's config at mcp-server/index.js
npm run mcp-buyer       # an independent MCP *client* script — proves the interop end-to-end
```

`mcpBuyerAgent.js` is a genuinely separate process: it never imports `bookingService`, never reads `RAZORPAY_KEY_SECRET`, and talks to the merchant only through the MCP protocol. It discovers the catalog, converses with Altia, reserves a trek — all for real, over MCP — then **deliberately** tries to confirm payment with a made-up signature to demonstrate the honest boundary: it can prove reservation is truly external, but it cannot fake a payment, because it was never given the means to.

Neither of these is a formal ACP/AP2/x402 implementation — they're a pragmatic "discover → structured offer → bounded transact call" surface in that spirit, built to be legible (and, for MCP, literally usable) by an agent that has never seen this API before.

### The AI buyer demo (`Backend/scripts/aiBuyerAgent.js`)

A standalone script — not part of the web app — that plays the *buyer* role autonomously against the real running API over plain REST:

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

**Payment note:** the script has no browser, so it can't drive Razorpay's actual Checkout widget. It exercises the *real* signature-verification code (`POST /bookings/confirm`, HMAC-SHA256 over `order_id|payment_id`) using a payment id it makes up and signs with the test-mode key secret the server already holds for this account. This is a simulated payment-gateway callback for demo purposes, not a live Razorpay transaction. Every other step (catalog discovery, AI recommendation, guardrail evaluation, atomic slot reservation, order creation, audit logging) is real.

### What we learned trying to make it a *real* payment (`Backend/scripts/realPaymentAttempt.js`)

We didn't stop at "simulated is good enough" without checking. This script drives Razorpay's **actual** test-mode Checkout widget in a real Playwright/Chromium browser — no shortcuts — through opening the widget, the contact-details step, selecting Cards, and submitting Razorpay's own published test card (`4111 1111 1111 1111`).

It reliably stops there: Razorpay's checkout runs real fraud-prevention (Stripe's HumanSecurity integration + an invisible hCaptcha challenge) even in test mode — visible directly in the page's own iframe list as `hcaptcha.html#frame=challenge`. A scripted, headless browser correctly gets flagged, and the "Authenticating Payment" step never resolves. **The script detects this and reports it honestly rather than attempting to defeat it** — bypassing a production anti-fraud system is not something to automate around, even for a demo.

```bash
# get a real order id first:
curl -X POST http://localhost:5000/api/v1/bookings/create -H "Content-Type: application/json" \
  -d '{"batchId":"batch_trk_001_01","customerId":"demo","customerFitnessLevel":6,"source":"human"}'
# then:
node scripts/realPaymentAttempt.js <razorpayOrderId> <amountInPaise>
```

This is why `aiBuyerAgent.js`'s fully-autonomous flow uses the simulated payment callback: it's the honest, achievable alternative to a wall (bot detection) that exists on purpose, and real end-to-end automated payment would require a pre-authorized/tokenized mandate (e.g. Razorpay saved-card/UPI-Autopay consent set up once by a human) rather than raw card automation.

## Automated tests

```bash
cd Backend
npm test
```

23 tests (Node's built-in test runner, no extra framework) run against the **real** `bookingService` and a real MongoDB connection — isolated to an auto-created `<database>_test` database, never the one a demo/judge would look at. They prove the specific claims this project makes, not just that the code compiles:

- Guardrails (fitness, budget, add-on cap) genuinely block, and a rejected booking never reserves a slot.
- Two concurrent requests for the last slot: exactly one wins, the batch is never over-booked.
- Group bookings reserve N slots atomically and price at `perPersonPrice × travelers`; an over-capacity group booking is rejected with zero partial reservation.
- A correctly-signed payment confirms; a forged signature is rejected **and releases the slot it was holding**.

## Running it

```bash
# Backend
cd Backend
npm install
cp .env.example .env   # fill in MONGO_URI, RAZORPAY_KEY_ID/SECRET (test mode), GROQ_API_KEY
                         # GMAIL_USER/GMAIL_APP_PASSWORD are optional — enables an AI-personalized
                         # booking receipt email; booking works fine without them
npm run seed            # seeds 25 treks, batches, add-ons, and a 1-slot-left race-condition fixture
npm run dev              # http://localhost:5000
npm test                 # optional: run the automated suite against an isolated test DB

# Frontend
cd Frontend
npm install
cp .env.example .env    # VITE_RAZORPAY_KEY_ID must match the backend's RAZORPAY_KEY_ID
npm run dev               # http://localhost:5173
```

## Deploying it (a live link for judges)

Split hosting: **Vercel for the frontend, Render for the backend.** Vercel's serverless model doesn't fit the backend — it runs a `setInterval` sweep for abandoned checkouts and an in-memory rate limiter, both of which need a normal long-running process, which Render (or Railway) gives you for free with zero code changes. MongoDB is already on Atlas, so nothing to do there.

1. **Push to GitHub** (the repo already has a remote configured) — both platforms deploy from the connected repo.
2. **Backend on Render**: new Web Service → connect the repo, root directory `Backend/`.
   - Build command: `npm install --omit=dev` (skips `playwright`, a devDependency only used by the local `realPaymentAttempt.js` exploration script — no need to download a browser on the server).
   - Start command: `npm start`
   - Environment variables: `MONGO_URI`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GROQ_API_KEY`, `NODE_ENV=production`. Render sets `PORT` itself.
   - Once deployed, note the URL (e.g. `https://altitude-api.onrender.com`).
3. **Frontend on Vercel**: new project → connect the repo, root directory `Frontend/`. Vercel auto-detects the Vite build; `vercel.json` already includes the SPA rewrite so client-side routes like `/trek/:id` and `/demo` work on direct navigation/refresh.
   - Environment variables: `VITE_RAZORPAY_KEY_ID` (same test key as the backend), `VITE_API_BASE_URL` = the Render URL from step 2.
4. **Seed the deployed database** once: either run `npm run seed` locally against the same `MONGO_URI`, or temporarily add a one-off Render shell command.
5. **Heads up for judges**: Render's free tier spins a service down after ~15 minutes idle; the first request after that takes 30-60s to wake up. If a judge's first click seems to hang, that's why — not a bug.

## How to demo (< 3 minutes)

1. **Human path**: Home → pick a trek → select a batch/add-ons/traveler count → "Book Now" → Razorpay test card (`4111 1111 1111 1111`, any future expiry/CVV) → confirmed booking → "My Bookings".
2. **Agent path, same UI**: on a trek page, click **"Book with Concierge"** (or chat with Altia — try "a trek under 15000 for 3 people", then "book this") — the checkout modal shows a *"Booking via AI Concierge (source: agent)"* badge and pre-filled contact details, and the resulting booking flows through `/chat/book` with its own guardrail trace.
3. **Admin Audit** (`/admin`): shows both `Human (Web)` and `API Agent` entries, revenue/rejection analytics with a chart, and a per-check pass/fail trace for every decision — including the AI's own reasoning steps, not just payment events.
4. **Watch an AI Buy** (`/demo`, in the nav): pick a demo (REST AI buyer happy path, a deliberate guardrail rejection, or the independent MCP buyer) and hit "Run demo" — it runs the actual script from `Backend/scripts/` on the server and streams the real output live in the browser, with a step tracker parsed straight from that output. No terminal needed; this is what makes the CLI-only agent demos visible on the live link.
5. **Autonomous AI buyer (REST)**: `npm run ai-buyer`, then `npm run ai-buyer:fail` for a clean guardrail rejection.
6. **Autonomous AI buyer (MCP — a genuinely separate agent)**: `npm run mcp-buyer` — watch it discover, converse, and reserve entirely over the MCP protocol with zero access to this codebase, then honestly fail to fake a payment.
7. **Race safety**: fire two concurrent `POST /bookings/create` requests at `batch_trk_001_race` (seeded with exactly 1 slot left) — exactly one succeeds.
8. **Prove it**: `npm test` — 23 tests, green.

## Guardrails reference

| Guardrail | Enforced in | Behavior |
|---|---|---|
| Fitness | `checkFitness` | Rejects if `customerFitnessLevel < trek.minFitnessLevel` |
| Add-on cap | `checkAddonCap` | Rejects if add-on spend exceeds `ADDON_CAP_PERCENTAGE` (default 25%) of trek base price |
| Budget | `checkBudget` | Rejects if the per-person total exceeds `maxBudget`, when the caller supplies one |
| Slot availability (group-aware) | atomic `findOneAndUpdate` CAS with `$expr` | Race-safe for any group size; concurrent requests for the last N slots can't over-book |
| Rate limit | `express-rate-limit` on `/chat/*` | 20 req/min/IP, logged to the audit trail |
| Idempotency | `Booking.idempotencyKey` (unique, sparse) | Duplicate requests return the original result instead of double-booking |
| Abandoned checkout | periodic sweep in `server.js` | Releases all reserved slots if payment isn't completed within 15 minutes |

Every row above writes to `AuditLog` with `actor` (`human`/`agent`/`system`), `decision`, `outcome`, a human-readable `reason`, and (where applicable) a per-check `trace[]`.
