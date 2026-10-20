import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextCommandIndex } from './commandPaletteNavigation.js';

test('moves the active command down and up within the result list', () => {
  assert.equal(nextCommandIndex(0, 'down', 3), 1);
  assert.equal(nextCommandIndex(1, 'up', 3), 0);
  assert.equal(nextCommandIndex(1, 'down', 3), 2);
});

test('keeps active command at list boundaries', () => {
  assert.equal(nextCommandIndex(0, 'up', 3), 0);
  assert.equal(nextCommandIndex(2, 'down', 3), 2);
});

test('safely handles empty results and out-of-range indexes', () => {
  assert.equal(nextCommandIndex(0, 'down', 0), 0);
  assert.equal(nextCommandIndex(-4, 'down', 2), 1);
  assert.equal(nextCommandIndex(99, 'up', 2), 0);
  assert.equal(nextCommandIndex(1, 'other', 2), 1);
  assert.equal(nextCommandIndex(1, 'down', Number.NaN), 0);
});
