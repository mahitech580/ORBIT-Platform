import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRenderSmokeFrame } from './smokePlayback.js';

test('renders while the canvas is mounted, visible, and in the viewport', () => {
  assert.equal(canRenderSmokeFrame(false, true, true), true);
});

test('stops rendering after the component is disposed', () => {
  assert.equal(canRenderSmokeFrame(true, true, true), false);
});

test('stops rendering while the document is hidden', () => {
  assert.equal(canRenderSmokeFrame(false, false, true), false);
});

test('stops rendering while the canvas is outside the viewport', () => {
  assert.equal(canRenderSmokeFrame(false, true, false), false);
});
