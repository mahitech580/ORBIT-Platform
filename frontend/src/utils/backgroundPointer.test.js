import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldTrackBackgroundPointer } from './backgroundPointer.js';

test('tracks the primary mouse or pen pointer when motion is allowed', () => {
  assert.equal(shouldTrackBackgroundPointer({ pointerType: 'mouse', isPrimary: true }, false), true);
  assert.equal(shouldTrackBackgroundPointer({ pointerType: 'pen', isPrimary: true }, false), true);
});

test('does not schedule pointer-driven shader changes for touch input', () => {
  assert.equal(shouldTrackBackgroundPointer({ pointerType: 'touch', isPrimary: true }, false), false);
});

test('ignores secondary pointers and reduced-motion sessions', () => {
  assert.equal(shouldTrackBackgroundPointer({ pointerType: 'mouse', isPrimary: false }, false), false);
  assert.equal(shouldTrackBackgroundPointer({ pointerType: 'mouse', isPrimary: true }, true), false);
});

test('ignores missing pointer events', () => {
  assert.equal(shouldTrackBackgroundPointer(null, false), false);
});
