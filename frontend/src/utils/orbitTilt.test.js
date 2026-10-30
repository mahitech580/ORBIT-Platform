import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOrbitTilt } from './orbitTilt.js';

const bounds = { left: 100, top: 50, width: 400, height: 200 };

test('keeps the scene level when the pointer is at the center', () => {
  assert.deepEqual(getOrbitTilt(300, 150, bounds), { x: 0, y: 0 });
});

test('maps the scene corners to the configured maximum tilt', () => {
  assert.deepEqual(getOrbitTilt(100, 50, bounds), { x: -6, y: 4.5 });
  assert.deepEqual(getOrbitTilt(500, 250, bounds), { x: 6, y: -4.5 });
});

test('clamps pointer coordinates that fall outside the scene bounds', () => {
  assert.deepEqual(getOrbitTilt(-1000, -1000, bounds), { x: -6, y: 4.5 });
  assert.deepEqual(getOrbitTilt(1000, 1000, bounds), { x: 6, y: -4.5 });
});

test('handles zero-sized bounds without producing non-finite values', () => {
  const tilt = getOrbitTilt(0, 0, { left: 0, top: 0, width: 0, height: 0 });
  assert.deepEqual(tilt, { x: -6, y: 4.5 });
  assert.ok(Number.isFinite(tilt.x));
  assert.ok(Number.isFinite(tilt.y));
});

test('returns a neutral tilt for invalid pointer geometry', () => {
  assert.deepEqual(getOrbitTilt(Number.NaN, 20, bounds), { x: 0, y: 0 });
  assert.deepEqual(getOrbitTilt(20, 20, null), { x: 0, y: 0 });
});
