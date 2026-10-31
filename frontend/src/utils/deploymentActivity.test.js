import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWeeklyDeploymentActivity } from './deploymentActivity.js';

test('groups the last seven local calendar days in one status summary', () => {
  const now = new Date(2026, 9, 31, 12, 0, 0);
  const local = (daysAgo, hour = 12) => {
    const value = new Date(now);
    value.setDate(value.getDate() - daysAgo);
    value.setHours(hour, 0, 0, 0);
    return value.toISOString();
  };
  const weekly = buildWeeklyDeploymentActivity([
    { id: 1, status: 'completed', created_at: local(0) },
    { id: 2, status: 'FAILED', created_at: local(0, 13) },
    { id: 3, status: 'in-progress', created_at: local(0, 14) },
    { id: 4, status: 'cancelled', created_at: local(0, 15) },
    { id: 5, status: 'completed', created_at: local(1) },
    { id: 6, status: 'completed', created_at: local(7) },
    { id: 7, status: 'failed', created_at: 'not-a-date' },
    null,
    'invalid'
  ], now);

  assert.equal(weekly.length, 7);
  assert.deepEqual(
    { ...weekly[6], date: undefined },
    {
      key: '2026-9-31',
      day: now.toLocaleDateString(undefined, { weekday: 'short' }),
      date: undefined,
      total: 4,
      completed: 1,
      failed: 1,
      pending: 1,
      other: 1
    }
  );
  assert.equal(weekly[5].total, 1);
  assert.equal(weekly[0].total, 0);
});

test('returns seven empty buckets for missing or malformed collections', () => {
  for (const value of [null, undefined, 'invalid']) {
    const weekly = buildWeeklyDeploymentActivity(value, new Date(2026, 9, 31, 12));
    assert.equal(weekly.length, 7);
    assert.equal(weekly.reduce((sum, day) => sum + day.total, 0), 0);
  }
});

test('rejects an invalid reference date without throwing', () => {
  assert.deepEqual(buildWeeklyDeploymentActivity([], new Date(NaN)), []);
});
