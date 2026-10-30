import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeDeploymentActivity } from './deploymentActivityLabel.js';

test('describes daily totals and each visible status series', () => {
  const label = describeDeploymentActivity([{
    day: 'Fri',
    date: new Date('2026-10-30T12:00:00Z'),
    total: 5,
    completed: 2,
    failed: 1,
    pending: 2
  }]);
  assert.equal(
    label,
    'Daily deployment records over the last seven days. Fri 30: 5 total, 2 completed, 1 failed, 2 pending.'
  );
});

test('reports deployments with statuses outside the chart series', () => {
  const label = describeDeploymentActivity([{
    day: 'Thu',
    total: 4,
    completed: 1,
    failed: 0,
    pending: 1
  }]);
  assert.match(label, /2 other/);
});

test('returns a useful alternative when no chart days are supplied', () => {
  assert.equal(
    describeDeploymentActivity([]),
    'No deployment activity has been recorded in the last seven days.'
  );
  assert.equal(
    describeDeploymentActivity(null),
    'No deployment activity has been recorded in the last seven days.'
  );
});

test('normalizes malformed chart counts without exposing NaN or negative values', () => {
  const label = describeDeploymentActivity([{
    day: 'Wed',
    total: -4,
    completed: Number.NaN,
    failed: -1,
    pending: '3'
  }]);
  assert.equal(
    label,
    'Daily deployment records over the last seven days. Wed: 0 total, 0 completed, 0 failed, 0 pending.'
  );
});
