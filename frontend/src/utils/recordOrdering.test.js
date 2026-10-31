import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareNewestFirst } from './recordOrdering.js';

test('orders newer timestamps before older timestamps', () => {
  const newer = { id: 1, created_at: '2026-10-31T12:00:00Z' };
  const older = { id: 99, created_at: '2026-10-30T12:00:00Z' };
  assert.ok(compareNewestFirst(newer, older, 'created_at') < 0);
});

test('uses descending numeric IDs when timestamps are equal', () => {
  const lower = { id: 4, created_at: '2026-10-31T12:00:00Z' };
  const higher = { id: 12, created_at: '2026-10-31T12:00:00Z' };
  assert.ok(compareNewestFirst(higher, lower, 'created_at') < 0);
});

test('places invalid timestamps after valid records', () => {
  const valid = { id: 1, created_at: '2026-10-31T12:00:00Z' };
  const invalid = { id: 99, created_at: 'not-a-date' };
  assert.ok(compareNewestFirst(valid, invalid, 'created_at') < 0);
});

test('uses descending IDs when both timestamps are invalid', () => {
  const lower = { id: 2, created_at: null };
  const higher = { id: 3, created_at: 'bad-date' };
  assert.ok(compareNewestFirst(higher, lower, 'created_at') < 0);
});
