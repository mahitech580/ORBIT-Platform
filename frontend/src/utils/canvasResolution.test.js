import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCanvasBackingSize } from './canvasResolution.js';

test('caps high-density displays to the configured pixel ratio', () => {
  assert.deepEqual(getCanvasBackingSize(320.5, 180.25, 2), { width: 432, height: 243 });
});

test('preserves the CSS pixel size at a one-to-one device ratio', () => {
  assert.deepEqual(getCanvasBackingSize(200, 100, 1), { width: 200, height: 100 });
});

test('keeps a minimum one-pixel backing size for collapsed elements', () => {
  assert.deepEqual(getCanvasBackingSize(0, -20, 2), { width: 1, height: 1 });
});

test('falls back safely for invalid dimensions and device ratios', () => {
  assert.deepEqual(getCanvasBackingSize(Number.NaN, Number.POSITIVE_INFINITY, Number.NaN), { width: 1, height: 1 });
});

test('supports a caller-supplied pixel-ratio ceiling', () => {
  assert.deepEqual(getCanvasBackingSize(100, 50, 3, 2), { width: 200, height: 100 });
});
