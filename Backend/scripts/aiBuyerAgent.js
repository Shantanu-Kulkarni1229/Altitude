/**
 * Standalone AI buyer agent.
 *
 * Plays the *buyer* role end-to-end with no human in the loop, against the
 * real running Altitude API (start the server separately: `npm run dev`):
 *
 *   discover (agent-readable catalog)
 *     -> decide (real Groq-backed AI pipeline via /chat/message)
 *     -> reserve (guardrail-gated /chat/book, source: 'agent')
 *     -> pay (Razorpay test-mode order, confirmed via signature verification)
 *     -> confirm (query the audit trail for this run's correlationId)
 *
 * Usage:
 *   node scripts/aiBuyerAgent.js                 happy path
 *   node scripts/aiBuyerAgent.js --fail=fitness   deliberately fails the fitness guardrail
 *   node scripts/aiBuyerAgent.js --fail=budget    deliberately fails the budget guardrail
 *
 * Payment note: this script has no browser, so it cannot drive Razorpay's
 * actual Checkout widget. It exercises the REAL signature-verification code
 * path (POST /bookings/confirm, HMAC-SHA256 over order_id|payment_id) using
 * a payment id it makes up and signs with the test-mode key secret — the
 * same secret the server already has for this test account. This is a
 * simulated payment gateway callback for demo purposes, not a live Razorpay
 * transaction; it proves the verification logic works end-to-end without
 * needing a real card entry.
 */

require('dotenv').config();
const crypto = require('crypto');

const BASE_URL = process.env.AI_BUYER_BASE_URL || 'http://localhost:5000';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

function parseArgs() {
  const failArg = process.argv.find((a) => a.startsWith('--fail'));
  if (!failArg) return { failMode: null };
  const [, value] = failArg.split('=');
  return { failMode: value || 'fitness' };
}

function step(n, title) {
  console.log(`\n[${n}] ${title}`);
  console.log('-'.repeat(60));
}

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function fakeRazorpayPaymentId() {
  return `pay_sim_${crypto.randomBytes(8).toString('hex')}`;
}

function signPayment(orderId, paymentId) {
  return crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function main() {
  const { failMode } = parseArgs();
  const correlationId = crypto.randomUUID();
  const customerId = `ai-buyer-${correlationId.slice(0, 8)}`;

  console.log('='.repeat(60));
  console.log('AI BUYER AGENT — autonomous discover -> decide -> reserve -> pay -> confirm');
  console.log(`Run correlationId: ${correlationId}`);
  if (failMode) console.log(`Mode: DELIBERATE FAILURE ("${failMode}" guardrail) — demonstrates graceful rejection.`);
  console.log('='.repeat(60));

  // 1. DISCOVER
  step(1, 'DISCOVER — GET /api/v1/agent/catalog');
  const catalogRes = await api('GET', '/api/v1/agent/catalog');
  if (catalogRes.status !== 200) {
    console.error('Failed to reach catalog. Is the server running (npm run dev)?', catalogRes.data);
    process.exitCode = 1;
    return;
  }
  const { products, addOns } = catalogRes.data;
  console.log(`Discovered ${products.length} treks, ${addOns.length} add-ons, and the merchant's guardrail/capability manifest.`);

  // 2. DECIDE — genuinely uses the same AI pipeline a human chat user hits.
  // Note: for --fail=fitness we deliberately don't state a fitness level in
  // the chat message — otherwise the retrieval stage itself would filter out
  // the extreme trek before we ever reach the reservation guardrail. We want
  // the rejection to come from the booking guardrail (checkFitness), not
  // from retrieval finding no matches, so the guardrail trace is visible.
  const goalMessage = failMode === 'fitness'
    ? "I want an extreme, high-altitude expedition trek."
    : "I want a moderate difficulty trek, ideally under ₹15000, I'm reasonably fit.";

  step(2, `DECIDE — POST /api/v1/chat/message  ("${goalMessage}")`);
  const chatRes = await api('POST', '/api/v1/chat/message', {
    message: goalMessage,
    context: { correlationId }
  });
  console.log(`Response type: ${chatRes.data.type}`);
  console.log(`Concierge: ${chatRes.data.text}`);

  if (chatRes.data.type !== 'recommendation') {
    console.log('\nNo bookable recommendation returned — nothing further to do. Exiting cleanly.');
    return;
  }

  const topTrek = chatRes.data.data.treks[0];
  const suggestedAddon = chatRes.data.data.suggestedAddon;
  const batch = topTrek.batches && topTrek.batches[0];
  console.log(`Top match: ${topTrek.name} (min fitness ${topTrek.minFitnessLevel}, ₹${topTrek.basePrice})`);
  console.log(`AI reasoning: ${topTrek.reasoning}`);
  if (suggestedAddon) {
    console.log(`AI upsell suggestion: ${suggestedAddon.addonName} — ${suggestedAddon.reason} (not added to this order; shown for explainability only)`);
  }

  if (!batch) {
    console.log('\nNo open batch available for the top match. Exiting cleanly.');
    return;
  }

  // 3. RESERVE — guardrail-gated, source: 'agent'.
  const reservePayload = {
    batchId: batch.batchId,
    customerId,
    customerFitnessLevel: failMode === 'fitness' ? 1 : 6,
    correlationId
  };
  if (failMode === 'budget') {
    reservePayload.maxBudget = Math.floor(topTrek.basePrice * 0.5); // deliberately too low
  }

  step(3, `RESERVE — POST /api/v1/chat/book  (batch ${batch.batchId}, fitness ${reservePayload.customerFitnessLevel}${reservePayload.maxBudget ? `, maxBudget ₹${reservePayload.maxBudget}` : ''})`);
  const bookRes = await api('POST', '/api/v1/chat/book', reservePayload);

  if (bookRes.data.type === 'booking_failure') {
    console.log(`REJECTED by guardrail: ${bookRes.data.text}`);
    console.log('\nThis is the "one failure handled gracefully" case: no slot was held, no payment order');
    console.log('was created, and the rejection is captured in the audit trail below.');
    await printAuditTrail(correlationId);
    console.log('\nAI buyer run finished (deliberate rejection demo).');
    return;
  }

  const { booking, order, totalAmount } = bookRes.data.data;
  console.log(`Reserved. bookingId=${booking.bookingId}, razorpayOrderId=${order.id}, totalAmount=₹${totalAmount}`);

  // 4. PAY (simulated Razorpay test-mode callback — see file header note).
  step(4, 'PAY — simulate Razorpay test-mode payment callback, verify via HMAC signature');
  const paymentId = fakeRazorpayPaymentId();
  const signature = signPayment(order.id, paymentId);
  const confirmRes = await api('POST', '/api/v1/bookings/confirm', {
    razorpay_order_id: order.id,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    bookingId: booking.bookingId
  });

  if (confirmRes.status !== 200) {
    console.error('Payment confirmation failed:', confirmRes.data);
    process.exitCode = 1;
    return;
  }
  console.log(`Payment verified and booking confirmed. status=${confirmRes.data.data.status}`);

  // 5. CONFIRM — show the resulting audit trail.
  step(5, 'AUDIT — GET /api/v1/audit?actor=agent');
  await printAuditTrail(correlationId);

  console.log('\nAI buyer run finished successfully — full discover -> decide -> reserve -> pay -> confirm cycle, no human in the loop.');
}

async function printAuditTrail(correlationId) {
  const auditRes = await api('GET', '/api/v1/audit?actor=agent');
  const entries = (auditRes.data.data || []).filter((e) => e.correlationId === correlationId).reverse();
  if (entries.length === 0) {
    console.log('(no audit entries found for this run yet)');
    return;
  }
  for (const e of entries) {
    console.log(`  [${e.action}] decision=${e.decision} outcome=${e.outcome} — ${e.reason}`);
    if (e.trace && e.trace.length > 0) {
      for (const t of e.trace) {
        console.log(`      - ${t.check}: ${t.passed ? 'PASS' : 'FAIL'} (${t.reason})`);
      }
    }
  }
}

main().catch((err) => {
  console.error('\nAI buyer agent crashed unexpectedly:', err);
  process.exitCode = 1;
});
