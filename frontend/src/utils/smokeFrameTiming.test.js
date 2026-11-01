import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSmokeFrameDelay } from './smokeFrameTiming.js';

test('allows the first frame immediately', () => {
  assert.equal(getSmokeFrameDelay(10, 0), 0);
});

test('waits only for the remaining part of the 30fps interval', () => {
  assert.equal(getSmokeFrameDelay(116, 100), 18);
});

test('does not delay when the frame interval has elapsed', () => {
  assert.equal(getSmokeFrameDelay(140, 100), 0);
});

test('handles invalid clocks and intervals without stalling animation', () => {
  assert.equal(getSmokeFrameDelay(Number.NaN, 100), 0);
  assert.equal(getSmokeFrameDelay(120, Number.NaN), 0);
  assert.equal(getSmokeFrameDelay(120, 100, 0), 0);
  assert.equal(getSmokeFrameDelay(90, 100), 0);
});

test('supports a caller-supplied frame interval', () => {
  assert.equal(getSmokeFrameDelay(108, 100, 16), 8);
});
