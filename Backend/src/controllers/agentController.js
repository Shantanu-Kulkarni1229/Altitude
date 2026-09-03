const Trek = require('../models/Trek');
const Batch = require('../models/Batch');
const AddOn = require('../models/AddOn');

// Machine-readable catalog + capability manifest for external AI buyers.
// This is not a formal ACP/AP2/x402 implementation — it's a pragmatic,
// self-describing "discover -> structured offer -> bounded transact call"
// surface in that spirit: an agent that has never seen this API should be
// able to read this one document and know exactly what it can buy, what
// will be checked before money moves, and how to prove payment.
exports.getCatalog = async (req, res) => {
  const addOnCapPercentage = process.env.ADDON_CAP_PERCENTAGE ? Number(process.env.ADDON_CAP_PERCENTAGE) : 0.25;

  const treks = await Trek.find({});
  const addOns = await AddOn.find({});
  const batches = await Batch.find({ status: { $ne: 'cancelled' } });

  const products = treks.map((trek) => {
    const trekBatches = batches.filter((b) => String(b.trekId) === String(trek._id));
    return {
      id: trek.trekId,
      name: trek.name,
      description: trek.description,
      region: trek.region,
      difficulty: trek.difficulty,
      durationDays: trek.durationDays,
      minFitnessLevel: trek.minFitnessLevel,
      basePrice: trek.basePrice,
      currency: 'INR',
      offers: trekBatches.map((b) => ({
        batchId: b.batchId,
        startDate: b.startDate,
        endDate: b.endDate,
        price: b.price,
        currency: 'INR',
        slotsAvailable: Math.max(b.totalSlots - b.slotsBooked, 0),
        status: b.status
      }))
    };
  });

  res.status(200).json({
    success: true,
    merchant: {
      name: 'Altitude',
      description: 'Himalayan & Nepal trek marketplace, Razorpay test-mode payments.',
      currency: 'INR'
    },
    addOns: addOns.map((a) => ({ id: a.addOnId, name: a.name, price: a.price, category: a.category, description: a.description })),
    guardrails: {
      fitness: 'Reservation is rejected if the buyer-supplied customerFitnessLevel is below the product\'s minFitnessLevel.',
      addOnCap: `Reservation is rejected if selected add-on spend exceeds ${addOnCapPercentage * 100}% of the trek's basePrice.`,
      budget: 'If the caller supplies maxBudget, reservation is rejected if totalAmount exceeds it.',
      slotAvailability: 'Slot reservation is atomic; concurrent requests for the last slot cannot both succeed.'
    },
    capabilities: {
      discover: {
        method: 'GET',
        path: '/api/v1/agent/catalog',
        description: 'This document. Structured product/offer catalog plus how to transact.'
      },
      converse: {
        method: 'POST',
        path: '/api/v1/chat/message',
        description: 'Natural-language discovery. Body: { message: string, context?: { lastTrekId, correlationId } }.'
      },
      reserve: {
        method: 'POST',
        path: '/api/v1/chat/book',
        description: 'Agent-attributed reservation. Evaluates fitness/addOnCap/budget/slot guardrails before creating a Razorpay test-mode order; every decision is written to the audit trail with actor="agent".',
        requiredFields: ['batchId', 'customerId', 'customerFitnessLevel'],
        optionalFields: ['addOnIds', 'maxBudget', 'idempotencyKey', 'correlationId'],
        onSuccess: 'Returns { booking, order, totalAmount } — pay `order.amount` via Razorpay test mode using `order.id`.',
        onFailure: 'Returns a human-readable rejection reason naming the guardrail that failed; no payment order is created and no slot is held.'
      },
      pay: {
        method: 'POST',
        path: '/api/v1/bookings/confirm',
        description: 'Submit Razorpay payment proof for HMAC-SHA256 verification.',
        requiredFields: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'bookingId']
      },
      cancel: {
        method: 'POST',
        path: '/api/v1/bookings/:bookingId/cancel',
        description: 'Cancel a confirmed booking; releases the reserved slot atomically.'
      },
      audit: {
        method: 'GET',
        path: '/api/v1/audit?actor=agent',
        description: 'Query the append-only, per-check decision trail for any actor (human/agent/system).'
      }
    },
    products
  });
};
