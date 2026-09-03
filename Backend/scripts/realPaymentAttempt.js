/**
 * Real-payment automation attempt (documented finding, not a working demo).
 *
 * This script drives Razorpay's ACTUAL test-mode Checkout widget in a real
 * browser (Playwright/Chromium) — no fabricated signatures, no shortcuts —
 * as far as it's legitimately possible to go: opens the widget, gets past
 * the contact-details step, selects Cards, and submits Razorpay's own
 * published test card (4111 1111 1111 1111).
 *
 * It reliably stops there. Razorpay's checkout runs real fraud-prevention
 * (Stripe's "HumanSecurity" + an invisible hCaptcha challenge) even in test
 * mode — visible directly in the page's iframe list as
 * `hcaptcha.html#frame=challenge`. A scripted, headless browser correctly
 * gets flagged by that layer, and the "Authenticating Payment" step never
 * resolves. That's the fraud-detection system working as designed.
 *
 * This script does NOT attempt to defeat, evade, or work around that
 * detection — doing so would mean deliberately bypassing a production
 * anti-fraud system, which is not something to automate around even for a
 * demo. Instead it detects the block, reports exactly what happened, and
 * exits cleanly. This is why `aiBuyerAgent.js`'s fully-autonomous flow uses
 * a clearly-labeled simulated payment callback instead of real browser
 * automation: it's the honest, achievable alternative to a wall that exists
 * on purpose.
 *
 * Usage (Altitude API server must be running separately, npm run dev):
 *   node scripts/realPaymentAttempt.js <razorpayOrderId> <amountInPaise>
 *
 * Get an order id first, e.g.:
 *   curl -X POST http://localhost:5000/api/v1/bookings/create \
 *     -H "Content-Type: application/json" \
 *     -d '{"batchId":"batch_trk_001_01","customerId":"demo","customerFitnessLevel":6,"source":"human"}'
 */

const { chromium } = require('playwright');

const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TTh1A8wfcPcoLQ';
const ORDER_ID = process.argv[2];
const AMOUNT_PAISE = process.argv[3];

if (!ORDER_ID || !AMOUNT_PAISE) {
  console.error('Usage: node scripts/realPaymentAttempt.js <razorpayOrderId> <amountInPaise>');
  process.exit(1);
}

const html = `
<!doctype html>
<html><body>
<div id="result">WAITING</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  new window.Razorpay({
    key: "${RAZORPAY_KEY_ID}",
    amount: "${AMOUNT_PAISE}",
    currency: "INR",
    name: "Altitude",
    description: "Real payment automation attempt",
    order_id: "${ORDER_ID}",
    prefill: { name: "Test User", email: "test@example.com", contact: "8734567190" },
    handler: function (response) {
      document.getElementById('result').innerText = 'PAYMENT_DONE:' + JSON.stringify(response);
    },
    modal: { ondismiss: function () { document.getElementById('result').innerText = 'DISMISSED'; } }
  }).open();
</script>
</body></html>
`;

function step(n, title) {
  console.log(`\n[${n}] ${title}`);
  console.log('-'.repeat(60));
}

async function main() {
  console.log('='.repeat(60));
  console.log('REAL PAYMENT AUTOMATION ATTEMPT — driving the actual Razorpay Checkout widget');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  step(1, 'Open the real Razorpay Checkout widget (test mode)');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  let frame = null;
  for (let i = 0; i < 20 && !frame; i++) {
    await page.waitForTimeout(500);
    frame = page.frames().find((f) => f.url().includes('checkout/public'));
  }
  if (!frame) throw new Error('Razorpay checkout iframe never appeared.');
  console.log('Checkout widget loaded.');

  step(2, 'Get past the contact-details step (prefilled name/email/phone)');
  try {
    await frame.getByRole('button', { name: /close/i }).click({ timeout: 3000 });
    await frame.getByText('Continue to payment', { exact: true }).click({ timeout: 3000 });
    console.log('Contact details accepted.');
  } catch {
    console.log('No contact-details prompt shown this run (session-dependent).');
  }

  step(3, 'Select Cards and wait for the card entry form to render');
  let cardFormReady = false;
  for (let attempt = 0; attempt < 5 && !cardFormReady; attempt++) {
    await page.mouse.click(568, 316);
    try {
      await frame.getByPlaceholder('Card Number').waitFor({ state: 'visible', timeout: 6000 });
      cardFormReady = true;
    } catch { /* retry */ }
  }
  if (!cardFormReady) throw new Error('Card entry form never appeared after retries.');
  console.log('Card entry form ready.');

  step(4, "Submit Razorpay's own published test card (4111 1111 1111 1111)");
  await frame.getByPlaceholder('Card Number').click();
  await frame.getByPlaceholder('Card Number').pressSequentially('4111111111111111', { delay: 30 });
  await frame.getByPlaceholder('MM / YY').pressSequentially('1230', { delay: 30 });
  await frame.getByPlaceholder('CVV').pressSequentially('123', { delay: 30 });
  await frame.getByText('Continue', { exact: true }).click();
  try {
    await frame.getByText('Maybe later', { exact: true }).click({ timeout: 4000 });
  } catch { /* prompt not shown */ }
  console.log('Test card submitted, Razorpay is now authenticating the payment...');

  step(5, 'Watch for either a real payment result or a fraud-detection challenge');
  let outcome = 'timeout';
  for (let i = 0; i < 15 && outcome === 'timeout'; i++) {
    await page.waitForTimeout(2000);

    const resultText = await page.textContent('#result').catch(() => 'WAITING');
    if (resultText !== 'WAITING') { outcome = 'paid'; break; }

    const captchaFrame = page.frames().find((f) => f.url().includes('hcaptcha.html') && f.url().includes('challenge'));
    if (captchaFrame) { outcome = 'blocked_by_fraud_detection'; break; }
  }

  if (outcome === 'paid') {
    const resultText = await page.textContent('#result');
    console.log('\nPAYMENT COMPLETED FOR REAL. Razorpay-issued proof:');
    console.log(resultText);
    console.log('\nThis payment_id and signature came from Razorpay\'s own servers — genuinely real,');
    console.log('not fabricated. POST it to /api/v1/bookings/confirm to complete the booking.');
  } else if (outcome === 'blocked_by_fraud_detection') {
    console.log('\nBLOCKED — as expected. Razorpay\'s real fraud-prevention layer (Stripe HumanSecurity');
    console.log('+ an invisible hCaptcha challenge) detected this as a scripted/headless browser and');
    console.log('is holding the "Authenticating Payment" step. This is the checkout\'s anti-fraud system');
    console.log('working correctly — this script will not attempt to defeat it.');
    console.log('\nConclusion: fully automated Razorpay payment completion is not achievable without a');
    console.log('real human (or a pre-authorized/tokenized payment mandate) completing the checkout —');
    console.log('which is why the autonomous demo (npm run ai-buyer) uses a clearly-labeled simulated');
    console.log('payment callback instead of claiming to bypass real payment security.');
  } else {
    console.log('\nTimed out without a clear result or an identifiable fraud-detection challenge.');
    console.log('The "Authenticating Payment" step likely stalled for the same underlying reason');
    console.log('(bot-detection), just without a matching hCaptcha frame URL this run.');
  }

  await browser.close();
}

main().catch((err) => {
  console.error('\nReal payment attempt crashed unexpectedly:', err.message);
  process.exitCode = 1;
});
