import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRefreshGate } from './refreshGate.js';

test('coalesces focus and visibility refreshes inside the cooldown window', () => {
  let now = 1000;
  let calls = 0;
  const run = createRefreshGate(() => { calls += 1; }, 1000, () => now);

  assert.equal(run(), true);
  assert.equal(run(), false);
  now += 999;
  assert.equal(run(), false);
  assert.equal(calls, 1);
  now += 1;
  assert.equal(run(), true);
  assert.equal(calls, 2);
});

test('keeps independent refresh gates independent', () => {
  let now = 500;
  let firstCalls = 0;
  let secondCalls = 0;
  const first = createRefreshGate(() => { firstCalls += 1; }, 1000, () => now);
  const second = createRefreshGate(() => { secondCalls += 1; }, 1000, () => now);

  assert.equal(first(), true);
  assert.equal(second(), true);
  assert.equal(firstCalls, 1);
  assert.equal(secondCalls, 1);
});

test('rejects missing callbacks and ignores invalid clock readings', () => {
  assert.throws(() => createRefreshGate(null), /callback/);
  let calls = 0;
  const run = createRefreshGate(() => { calls += 1; }, 1000, () => NaN);
  assert.equal(run(), false);
  assert.equal(calls, 0);
});
