/**
 * Independent MCP client demo.
 *
 * This script plays the role of a genuinely separate AI agent: it never
 * requires bookingService, never reads RAZORPAY_KEY_SECRET, and touches
 * the merchant ONLY through the MCP protocol (mcp-server/index.js), the
 * same way Claude Desktop or any other MCP client would. If this script
 * can discover, converse with, and reserve against the merchant, that's
 * real proof of external interop — not our own script calling our own
 * internal functions.
 *
 * It also deliberately tries (and is expected to fail) to confirm a
 * payment with a made-up signature, to demonstrate honestly that this
 * secret-free interface cannot fake a payment — only relay proof of one
 * that actually happened via Razorpay.
 *
 * Usage (the Altitude API server must be running separately, npm run dev):
 *   node scripts/mcpBuyerAgent.js
 */

const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

function step(n, title) {
  console.log(`\n[${n}] ${title}`);
  console.log('-'.repeat(60));
}

function textOf(result) {
  const text = result?.content?.find((c) => c.type === 'text')?.text;
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  console.log('='.repeat(60));
  console.log('MCP BUYER AGENT — an independent client, no shared secrets, no shared code');
  console.log('='.repeat(60));

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, '..', 'mcp-server', 'index.js')]
  });

  const client = new Client({ name: 'independent-mcp-buyer', version: '1.0.0' });
  await client.connect(transport);

  step(1, 'DISCOVER — list tools this MCP server exposes');
  const { tools } = await client.listTools();
  console.log(tools.map((t) => `  - ${t.name}: ${t.description.slice(0, 80)}...`).join('\n'));

  step(2, 'DISCOVER — call discover_catalog');
  const catalog = textOf(await client.callTool({ name: 'discover_catalog', arguments: {} }));
  console.log(`Discovered ${catalog.products.length} treks via MCP, zero access to this codebase.`);

  step(3, 'DECIDE — call ask_concierge');
  const goal = 'I want a moderate difficulty trek under 15000, I am reasonably fit.';
  const chatResult = textOf(await client.callTool({ name: 'ask_concierge', arguments: { message: goal } }));
  console.log(`Concierge (via MCP): ${chatResult.text}`);

  if (chatResult.type !== 'recommendation') {
    console.log('\nNo bookable recommendation returned. Ending run.');
    await client.close();
    return;
  }

  const topTrek = chatResult.data.treks[0];
  const batch = topTrek.batches && topTrek.batches[0];
  console.log(`Top match: ${topTrek.name} — ${topTrek.reasoning}`);

  if (!batch) {
    console.log('\nNo open batch for the top match. Ending run.');
    await client.close();
    return;
  }

  step(4, 'RESERVE — call reserve_trek');
  const reserveResult = textOf(await client.callTool({
    name: 'reserve_trek',
    arguments: {
      batchId: batch.batchId,
      customerId: `mcp-buyer-${Date.now()}`,
      customerFitnessLevel: 6
    }
  }));

  if (reserveResult.type === 'booking_failure') {
    console.log(`Reservation rejected by guardrail: ${reserveResult.text}`);
    await client.close();
    return;
  }

  const { booking, order } = reserveResult.data;
  console.log(`Reserved via MCP. bookingId=${booking.bookingId}, razorpayOrderId=${order.id}`);

  step(5, 'PAY (expected to fail) — call confirm_payment with a made-up signature');
  console.log('This client was never given the merchant\'s Razorpay secret, so it cannot');
  console.log('fabricate a valid signature. This call is expected to be rejected — that\'s');
  console.log('the honest boundary: MCP proves discovery + reservation are truly external,');
  console.log('but real payment still requires an actual Razorpay transaction.');
  const fakeConfirm = textOf(await client.callTool({
    name: 'confirm_payment',
    arguments: {
      razorpay_order_id: order.id,
      razorpay_payment_id: 'pay_made_up',
      razorpay_signature: 'not_a_real_signature',
      bookingId: booking.bookingId
    }
  }));
  console.log(`Result: status=${fakeConfirm.status} — ${fakeConfirm.error || JSON.stringify(fakeConfirm)}`);

  step(6, 'AUDIT — call get_audit_trail for actor=agent');
  const audit = textOf(await client.callTool({ name: 'get_audit_trail', arguments: { actor: 'agent' } }));
  const mine = (audit.data || []).filter((e) => e.correlationId === booking.correlationId);
  for (const e of mine) {
    console.log(`  [${e.action}] decision=${e.decision} outcome=${e.outcome} — ${e.reason}`);
  }

  console.log('\nMCP buyer run finished — discovered, conversed, and reserved entirely over MCP,');
  console.log('with a documented, honest boundary at the payment step.');

  await client.close();
}

main().catch((err) => {
  console.error('\nMCP buyer agent crashed unexpectedly:', err);
  process.exitCode = 1;
});
