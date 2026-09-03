const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { timingSafeEqualHex } = require('../src/utils/crypto');

describe('timingSafeEqualHex (Razorpay signature comparison)', () => {
  test('returns true for identical hex signatures', () => {
    const sig = crypto.createHmac('sha256', 'secret').update('order_1|pay_1').digest('hex');
    assert.equal(timingSafeEqualHex(sig, sig), true);
  });

  test('returns false for a tampered signature', () => {
    const sig = crypto.createHmac('sha256', 'secret').update('order_1|pay_1').digest('hex');
    const tampered = sig.slice(0, -2) + (sig.slice(-2) === '00' ? '11' : '00');
    assert.equal(timingSafeEqualHex(sig, tampered), false);
  });

  test('returns false (not a throw) for mismatched lengths', () => {
    assert.equal(timingSafeEqualHex('deadbeef', 'deadbeefdeadbeef'), false);
  });

  test('returns false for empty strings instead of throwing', () => {
    assert.equal(timingSafeEqualHex('', ''), false);
  });

  test('returns false for non-string input instead of throwing', () => {
    assert.equal(timingSafeEqualHex(undefined, undefined), false);
    assert.equal(timingSafeEqualHex(null, 'abcd'), false);
  });
});
