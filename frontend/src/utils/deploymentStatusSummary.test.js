import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeDeploymentStatuses } from './deploymentStatusSummary.js';

test('separates unknown and missing deployment states from pending records', () => {
  assert.deepEqual(summarizeDeploymentStatuses([
    { status: 'completed' },
    { status: 'FAILED' },
    { status: 'pending' },
    { status: 'in-progress' },
    { status: 'cancelled' },
    {},
    null,
    'invalid'
  ]), {
    total: 6,
    completed: 1,
    failed: 1,
    pending: 2,
    other: 2
  });
});

test('handles non-array deployment collections as empty', () => {
  assert.deepEqual(summarizeDeploymentStatuses(null), {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    other: 0
  });
});
