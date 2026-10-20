import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDialogFocusWrapIndex } from './dialogFocus.js';

test('wraps Tab and Shift+Tab at either dialog focus boundary', () => {
  assert.equal(getDialogFocusWrapIndex(2, 3, false), 0);
  assert.equal(getDialogFocusWrapIndex(0, 3, true), 2);
});

test('leaves normal in-dialog tab movement to the browser', () => {
  assert.equal(getDialogFocusWrapIndex(0, 3, false), -1);
  assert.equal(getDialogFocusWrapIndex(2, 3, true), -1);
});

test('does not wrap when focus information or focusable items are absent', () => {
  assert.equal(getDialogFocusWrapIndex(-1, 3, true), -1);
  assert.equal(getDialogFocusWrapIndex(0, 0, true), -1);
  assert.equal(getDialogFocusWrapIndex(0, Number.NaN, false), -1);
});
