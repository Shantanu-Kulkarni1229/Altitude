#!/usr/bin/env node
/**
 * Altitude MCP server.
 *
 * This is the proof that the merchant is genuinely transactable by an
 * outside AI agent, not just our own scripts: it exposes the catalog,
 * concierge, reservation, payment-confirmation, and audit-trail endpoints
 * as MCP tools over stdio, so ANY MCP-compatible client (Claude Desktop,
 * Claude Code, a custom agent, etc.) can connect to it directly and
 * discover/reserve/pay against the real running Altitude API — with no
 * access to this codebase and no privileged secret.
 *
 * Deliberately holds NO Razorpay secret and can't fabricate a payment
 * signature — `confirm_payment` only relays proof of a real payment
 * (order id / payment id / signature) to the server's own verification
 * logic. An MCP-connected agent can discover and reserve entirely on its
 * own, but completing payment still requires a real Razorpay interaction,
 * same PCI-DSS boundary as everywhere else in this project.
 *
 * Run standalone (the Altitude API server must be running separately):
 *   node mcp-server/index.js
 *
 * Or point an MCP client (e.g. Claude Desktop's claude_desktop_config.json)
 * at this file as a stdio MCP server.
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const BASE_URL = process.env.ALTITUDE_BASE_URL || 'http://localhost:5000';

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function textResult(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

const server = new McpServer({ name: 'altitude-merchant', version: '1.0.0' });

server.registerTool(
  'discover_catalog',
  {
    title: 'Discover Altitude catalog',
    description: 'Structured product/offer catalog for the Altitude trek marketplace, plus a description of every guardrail that will be evaluated and every endpoint needed to transact end-to-end (reserve, pay, cancel, audit). Call this first.'
  },
  async () => {
    const { data } = await api('GET', '/api/v1/agent/catalog');
    return textResult(data);
  }
);

server.registerTool(
  'ask_concierge',
  {
    title: 'Ask Altia, the Altitude trek concierge',
    description: "Natural-language discovery and recommendation, powered by the same AI pipeline the human web chat uses. Use this to find a trek matching a traveler's preferences (difficulty, budget, month, group size, fitness) or to ask follow-up questions about a trek already discussed.",
    inputSchema: {
      message: z.string().describe('The natural-language message, e.g. "a moderate trek under 15000 for 2 people"'),
      lastTrekId: z.string().optional().describe('trekId of the trek most recently discussed, for follow-up questions or "book this"'),
      correlationId: z.string().optional().describe('Carry the same id across a conversation so audit trail entries link together')
    }
  },
  async ({ message, lastTrekId, correlationId }) => {
    const { data } = await api('POST', '/api/v1/chat/message', { message, context: { lastTrekId, correlationId } });
    return textResult(data);
  }
);

server.registerTool(
  'reserve_trek',
  {
    title: 'Reserve a trek (agent-attributed)',
    description: "Reserve a trek batch, attributed to source:'agent' with its own guardrail trace in the audit log. Evaluates fitness, add-on-cap, budget, and slot-availability guardrails BEFORE creating a Razorpay order — a rejection means no slot was held and no order was created. On success, returns a Razorpay order to be paid via confirm_payment once a real payment has been completed.",
    inputSchema: {
      batchId: z.string(),
      customerId: z.string(),
      customerFitnessLevel: z.number().describe('1-10, must meet the trek\'s minimum'),
      travelers: z.number().int().positive().optional().describe('Number of people; defaults to 1. Reserves this many slots and multiplies the price.'),
      addOnIds: z.array(z.string()).optional(),
      maxBudget: z.number().optional().describe('Per-person budget cap; reservation is rejected if exceeded'),
      customerName: z.string().optional(),
      customerEmail: z.string().optional(),
      customerPhone: z.string().optional(),
      correlationId: z.string().optional()
    }
  },
  async (args) => {
    const { data } = await api('POST', '/api/v1/chat/book', args);
    return textResult(data);
  }
);

server.registerTool(
  'confirm_payment',
  {
    title: 'Confirm payment for a reservation',
    description: 'Submits proof of a completed Razorpay payment (order id, payment id, signature) for server-side HMAC-SHA256 verification. This tool has no access to the merchant\'s secret key and cannot fabricate a valid signature — the payment must have genuinely happened via Razorpay (e.g. a human completing Checkout) before this will succeed.',
    inputSchema: {
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
      bookingId: z.string()
    }
  },
  async (args) => {
    const { status, data } = await api('POST', '/api/v1/bookings/confirm', args);
    return textResult({ status, ...data });
  }
);

server.registerTool(
  'get_audit_trail',
  {
    title: 'Query the Altitude audit trail',
    description: 'Read-only, append-only log of every guardrail decision, AI reasoning step, and payment event — each with a human-readable reason and, where applicable, a per-check pass/fail trace. Use this to verify what actually happened for a given actor or correlationId.',
    inputSchema: {
      actor: z.enum(['human', 'agent', 'system']).optional(),
      outcome: z.enum(['success', 'failure', 'fallback', 'duplicate_rejected', 'rate_limit_exceeded']).optional()
    }
  },
  async ({ actor, outcome }) => {
    const params = new URLSearchParams();
    if (actor) params.set('actor', actor);
    if (outcome) params.set('outcome', outcome);
    const qs = params.toString();
    const { data } = await api('GET', `/api/v1/audit${qs ? `?${qs}` : ''}`);
    return textResult(data);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Altitude MCP server connected (stdio). Proxying to ${BASE_URL} — make sure the Altitude API server is running there.`);
}

main().catch((err) => {
  console.error('Altitude MCP server failed to start:', err);
  process.exitCode = 1;
});
