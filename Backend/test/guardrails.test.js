const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { checkBudget, checkFitness, checkAddonCap } = require('../src/utils/guardrails');

describe('checkFitness', () => {
  test('passes when customer fitness meets the requirement', () => {
    const result = checkFitness(7, 5);
    assert.equal(result.passed, true);
  });

  test('blocks when customer fitness is below the requirement', () => {
    const result = checkFitness(3, 9);
    assert.equal(result.passed, false);
    assert.match(result.reason, /Safety Guardrail/);
  });

  test('passes at the exact boundary', () => {
    const result = checkFitness(5, 5);
    assert.equal(result.passed, true);
  });
});

describe('checkBudget', () => {
  test('passes when no budget cap is supplied', () => {
    const result = checkBudget(50000, undefined);
    assert.equal(result.passed, true);
  });

  test('blocks when total exceeds the stated budget', () => {
    const result = checkBudget(12500, 5000);
    assert.equal(result.passed, false);
    assert.match(result.reason, /exceeds maximum budget/);
  });

  test('passes at the exact budget boundary', () => {
    const result = checkBudget(5000, 5000);
    assert.equal(result.passed, true);
  });
});

describe('checkAddonCap', () => {
  const originalCap = process.env.ADDON_CAP_PERCENTAGE;
  test('passes when add-on spend is within the default 25% cap', () => {
    delete process.env.ADDON_CAP_PERCENTAGE;
    const result = checkAddonCap(10000, 2000); // 20% <= 25%
    assert.equal(result.passed, true);
  });

  test('blocks when add-on spend exceeds the default 25% cap', () => {
    delete process.env.ADDON_CAP_PERCENTAGE;
    const result = checkAddonCap(10000, 3000); // 30% > 25%
    assert.equal(result.passed, false);
    assert.match(result.reason, /exceeds cap/);
  });

  test('respects a custom ADDON_CAP_PERCENTAGE', () => {
    process.env.ADDON_CAP_PERCENTAGE = '0.5';
    const result = checkAddonCap(10000, 4000); // 40% <= 50%
    assert.equal(result.passed, true);
    if (originalCap === undefined) delete process.env.ADDON_CAP_PERCENTAGE;
    else process.env.ADDON_CAP_PERCENTAGE = originalCap;
  });
});
