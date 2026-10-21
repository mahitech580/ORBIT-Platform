import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterMetricsByRange, parseMetricTimestamp } from './metricsFilters.js';

const NOW = Date.parse('2026-10-14T12:00:00.000Z');

test('filters telemetry to the requested 24-hour window', () => {
  const metrics = [
    { id: 1, timestamp: '2026-10-14T11:00:00.000Z' },
    { id: 2, timestamp: '2026-10-13T11:59:59.999Z' },
    { id: 3, timestamp: '2026-10-13T12:00:00.000Z' },
    { id: 4, timestamp: '2026-10-14T12:00:01.000Z' }
  ];
  assert.deepEqual(filterMetricsByRange(metrics, '24h', NOW).map(item => item.id), [1, 3]);
});

test('supports seven-day and thirty-day windows', () => {
  const metrics = [
    { id: 1, timestamp: '2026-10-13T12:00:00.000Z' },
    { id: 2, timestamp: '2026-10-01T12:00:00.000Z' },
    { id: 3, timestamp: '2026-09-13T12:00:00.000Z' }
  ];
  assert.deepEqual(filterMetricsByRange(metrics, '7d', NOW).map(item => item.id), [1]);
  assert.deepEqual(filterMetricsByRange(metrics, '30d', NOW).map(item => item.id), [1, 2]);
});

test('all mode retains source records with missing timestamps', () => {
  const metrics = [{ id: 1, timestamp: null }, { id: 2 }];
  assert.deepEqual(filterMetricsByRange(metrics, 'all', NOW), metrics);
});

test('bounded windows ignore malformed timestamps and future records', () => {
  const metrics = [
    { id: 1, timestamp: 'not a date' },
    { id: 2, timestamp: '2026-10-14T13:00:00.000Z' },
    null,
    'bad'
  ];
  assert.deepEqual(filterMetricsByRange(metrics, '24h', NOW), []);
});

test('unknown ranges return no matches rather than all records', () => {
  assert.deepEqual(filterMetricsByRange([{ timestamp: '2026-10-14T11:00:00.000Z' }], 'tomorrow', NOW), []);
});

test('filtering does not mutate or reorder source records', () => {
  const metrics = [
    { id: 3, timestamp: '2026-10-14T10:00:00.000Z' },
    { id: 1, timestamp: '2026-10-14T11:00:00.000Z' }
  ];
  const result = filterMetricsByRange(metrics, '24h', NOW);
  assert.deepEqual(result.map(item => item.id), [3, 1]);
  assert.deepEqual(metrics.map(item => item.id), [3, 1]);
});


test('parses Unix seconds and Unix milliseconds consistently', () => {
  assert.equal(parseMetricTimestamp(1791979200), NOW);
  assert.equal(parseMetricTimestamp(1791979200000), NOW);
});

test('parses Date objects and rejects invalid timestamp values', () => {
  assert.equal(parseMetricTimestamp(new Date(NOW)), NOW);
  assert.equal(Number.isNaN(parseMetricTimestamp('')), true);
  assert.equal(Number.isNaN(parseMetricTimestamp('invalid-date')), true);
  assert.equal(Number.isNaN(parseMetricTimestamp(null)), true);
  assert.equal(Number.isNaN(parseMetricTimestamp(new Date('invalid'))), true);
});

test('time-window filter includes a Unix-seconds measurement', () => {
  assert.deepEqual(filterMetricsByRange([
    { id: 1, timestamp: Math.floor(NOW / 1000) - 3600 },
    { id: 2, timestamp: Math.floor(NOW / 1000) - 90000 }
  ], '24h', NOW).map(item => item.id), [1]);
});


test('invalid range clock values produce no telemetry matches', () => {
  const metrics = [{ id: 1, timestamp: '2026-10-14T11:00:00.000Z' }];
  assert.deepEqual(filterMetricsByRange(metrics, '24h', Number.NaN), []);
  assert.deepEqual(filterMetricsByRange(metrics, '24h', Number.POSITIVE_INFINITY), []);
});
