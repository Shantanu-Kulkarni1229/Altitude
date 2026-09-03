require('dotenv').config();
const mongoose = require('mongoose');

let connected = false;

// Tests run against a *separate* database on the same cluster (same
// connection string, `_test` appended to the db name) — never the database
// the demo/judges will actually look at. Mongo creates it lazily on first
// write, so no manual provisioning is needed, and a failed/aborted test run
// can never leave stray bookings in the audit trail a judge is reading.
function getTestMongoUri() {
  const raw = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/altitude';
  try {
    const url = new URL(raw);
    const dbName = url.pathname.replace(/^\//, '') || 'altitude';
    url.pathname = `/${dbName}_test`;
    return url.toString();
  } catch {
    return raw;
  }
}

async function connectTestDb() {
  if (connected) return;
  await mongoose.connect(getTestMongoUri());
  connected = true;
}

async function disconnectTestDb() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

// A disposable trek/batch/add-on fixture set per test run. Even though tests
// already run in an isolated database, each run still gets a unique id
// namespace so multiple parallel/rerun test files never collide with
// each other's leftover data.
async function createFixtures(overrides = {}) {
  const Trek = require('../../src/models/Trek');
  const Batch = require('../../src/models/Batch');
  const AddOn = require('../../src/models/AddOn');

  const runId = `test-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const trek = await Trek.create({
    trekId: `trk-${runId}`,
    name: 'Test Fixture Trek',
    region: 'Testland',
    difficulty: 'moderate',
    minFitnessLevel: 5,
    basePrice: 10000,
    durationDays: 5,
    description: 'A trek that exists only for automated tests.',
    coverPhoto: 'https://example.com/cover.jpg',
    highlights: ['Fixture highlight'],
    itinerary: [{ day: 1, title: 'Fixture day', details: 'Fixture details' }],
    maxAltitude: '10,000 ft',
    trekDistance: '10 km'
  });

  const batch = await Batch.create({
    batchId: `batch-${runId}`,
    trekId: trek._id,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    totalSlots: overrides.totalSlots ?? 5,
    slotsBooked: overrides.slotsBooked ?? 0,
    price: 10000
  });

  const addOn = await AddOn.create({
    addOnId: `addon-${runId}`,
    name: 'Test Fixture Add-on',
    price: 500,
    category: 'gear',
    description: 'A gear add-on that exists only for automated tests.'
  });

  // Priced above the default 25% add-on cap on a 10000 base price (2500),
  // so it alone can trigger the AddonCap guardrail in tests.
  const expensiveAddOn = await AddOn.create({
    addOnId: `addon-expensive-${runId}`,
    name: 'Test Fixture Expensive Add-on',
    price: 4000,
    category: 'guide',
    description: 'A pricier add-on used to test the add-on spending cap.'
  });

  return { runId, trek, batch, addOn, expensiveAddOn };
}

async function cleanupFixtures({ runId }) {
  const Trek = require('../../src/models/Trek');
  const Batch = require('../../src/models/Batch');
  const AddOn = require('../../src/models/AddOn');
  const Booking = require('../../src/models/Booking');

  const batch = await Batch.findOne({ batchId: `batch-${runId}` });
  if (batch) await Booking.deleteMany({ batchId: batch._id });

  await Batch.deleteMany({ batchId: `batch-${runId}` });
  await Trek.deleteMany({ trekId: `trk-${runId}` });
  await AddOn.deleteMany({ addOnId: { $in: [`addon-${runId}`, `addon-expensive-${runId}`] } });
}

module.exports = { connectTestDb, disconnectTestDb, createFixtures, cleanupFixtures };
