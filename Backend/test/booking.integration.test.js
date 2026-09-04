// Integration tests — exercise the real bookingService against a real
// MongoDB connection (isolated `_test` database, see test/setup.js) and the
// real Razorpay test-mode API: guardrails actually block before payment,
// slot reservation is race-safe, group bookings reserve/price correctly,
// and payment signatures are genuinely verified.
require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { connectTestDb, disconnectTestDb, createFixtures, cleanupFixtures } = require('./helpers/setup');
const bookingService = require('../src/services/bookingService');
const Batch = require('../src/models/Batch');

before(connectTestDb);
after(disconnectTestDb);

describe('processBookingAttempt — guardrails', () => {
  let fixture;
  before(async () => { fixture = await createFixtures(); });
  after(async () => { await cleanupFixtures(fixture); });

  test('blocks a booking below the trek\'s minimum fitness level, without reserving a slot', async () => {
    await assert.rejects(
      bookingService.processBookingAttempt({
        batchId: fixture.batch.batchId,
        customerId: 'test-customer',
        customerFitnessLevel: 1, // fixture trek requires 5
        source: 'human'
      }),
      /Safety Guardrail/
    );

    const batch = await Batch.findById(fixture.batch._id);
    assert.equal(batch.slotsBooked, 0, 'a rejected booking must not consume a slot');
  });

  test('blocks a booking that exceeds the stated per-person budget', async () => {
    await assert.rejects(
      bookingService.processBookingAttempt({
        batchId: fixture.batch.batchId,
        customerId: 'test-customer',
        customerFitnessLevel: 8,
        maxBudget: 100, // trek costs 10000/person — must be rejected
        source: 'human'
      }),
      /exceeds maximum budget/
    );

    const batch = await Batch.findById(fixture.batch._id);
    assert.equal(batch.slotsBooked, 0, 'a rejected booking must not consume a slot');
  });

  test('blocks a booking whose add-on spend exceeds the cap', async () => {
    // fixture trek basePrice=10000, default cap 25% => max add-on spend 2500.
    // expensiveAddOn is priced 4000, alone over the cap.
    await assert.rejects(
      bookingService.processBookingAttempt({
        batchId: fixture.batch.batchId,
        customerId: 'test-customer',
        customerFitnessLevel: 8,
        addOnIds: [fixture.expensiveAddOn.addOnId],
        source: 'human'
      }),
      /exceeds cap/
    );

    const batch = await Batch.findById(fixture.batch._id);
    assert.equal(batch.slotsBooked, 0, 'a rejected booking must not consume a slot');
  });
});

describe('processBookingAttempt — group bookings', () => {
  let fixture;
  before(async () => { fixture = await createFixtures({ totalSlots: 5 }); });
  after(async () => { await cleanupFixtures(fixture); });

  test('reserves N slots and charges perPersonPrice x travelers', async () => {
    const { totalAmount, booking, order } = await bookingService.processBookingAttempt({
      batchId: fixture.batch.batchId,
      customerId: 'test-group-customer',
      customerFitnessLevel: 8,
      travelers: 3,
      source: 'human'
    });

    assert.equal(totalAmount, fixture.batch.price * 3);
    assert.equal(booking.travelers, 3);
    assert.ok(order.id, 'a Razorpay test-mode order should have been created');

    const batch = await Batch.findById(fixture.batch._id);
    assert.equal(batch.slotsBooked, 3, 'group booking should reserve all 3 seats atomically');
  });

  test('rejects a group booking that would exceed remaining capacity, with no partial reservation', async () => {
    // 3 of 5 seats are now taken (previous test); requesting 3 more should fail cleanly.
    await assert.rejects(
      bookingService.processBookingAttempt({
        batchId: fixture.batch.batchId,
        customerId: 'test-group-customer-2',
        customerFitnessLevel: 8,
        travelers: 3,
        source: 'human'
      }),
      /Not enough slots/
    );

    const batch = await Batch.findById(fixture.batch._id);
    assert.equal(batch.slotsBooked, 3, 'a rejected group booking must not partially reserve seats');
  });
});

describe('processBookingAttempt — atomic race safety', () => {
  let fixture;
  before(async () => { fixture = await createFixtures({ totalSlots: 1, slotsBooked: 0 }); });
  after(async () => { await cleanupFixtures(fixture); });

  test('exactly one of two concurrent requests for the last slot succeeds', async () => {
    const attempt = (customerId) => bookingService.processBookingAttempt({
      batchId: fixture.batch.batchId,
      customerId,
      customerFitnessLevel: 8,
      source: 'human'
    });

    const results = await Promise.allSettled([attempt('race-a'), attempt('race-b')]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'exactly one concurrent request should win the last slot');
    assert.equal(rejected.length, 1, 'the other concurrent request should be cleanly rejected');

    const batch = await Batch.findById(fixture.batch._id);
    assert.equal(batch.slotsBooked, 1, 'the batch must not be over-booked');
  });
});

describe('confirmBooking — payment signature verification', () => {
  let fixture;
  before(async () => { fixture = await createFixtures(); });
  after(async () => { await cleanupFixtures(fixture); });

  test('confirms a booking with a correctly signed payment', async () => {
    const { booking, order } = await bookingService.processBookingAttempt({
      batchId: fixture.batch.batchId,
      customerId: 'test-payer',
      customerFitnessLevel: 8,
      source: 'human'
    });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const paymentId = `pay_test_${Date.now()}`;
    const signature = crypto.createHmac('sha256', secret).update(`${order.id}|${paymentId}`).digest('hex');

    const confirmed = await bookingService.confirmBooking({
      razorpay_order_id: order.id,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      bookingId: booking.bookingId
    });

    assert.equal(confirmed.status, 'confirmed');
  });

  test('rejects a forged payment signature and releases the held slot', async () => {
    const before = await Batch.findById(fixture.batch._id);

    const { booking, order } = await bookingService.processBookingAttempt({
      batchId: fixture.batch.batchId,
      customerId: 'test-forger',
      customerFitnessLevel: 8,
      source: 'human'
    });

    await assert.rejects(
      bookingService.confirmBooking({
        razorpay_order_id: order.id,
        razorpay_payment_id: 'pay_forged',
        razorpay_signature: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        bookingId: booking.bookingId
      }),
      /Invalid payment signature/
    );

    const after = await Batch.findById(fixture.batch._id);
    assert.equal(after.slotsBooked, before.slotsBooked, 'the slot held by the forged-signature booking must be released');
  });
});
