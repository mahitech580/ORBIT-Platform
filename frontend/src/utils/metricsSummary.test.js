import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeMetricRecords, summarizeMetrics } from './metricsSummary.js';

test('computes average CPU and memory from numeric measurements', () => {
  assert.deepEqual(summarizeMetrics([
    { cpu_usage: 20, memory_usage: 200, requests_total: 10 },
    { cpu_usage: 40, memory_usage: 600, requests_total: 15 }
  ]), { avg_cpu: 30, avg_memory: 400, total_requests: 25 });
});

test('does not turn null or blank measurements into zero-valued samples', () => {
  assert.deepEqual(summarizeMetrics([
    { cpu_usage: null, memory_usage: '', requests_total: null },
    { cpu_usage: 70, memory_usage: 700, requests_total: 5 }
  ]), { avg_cpu: 70, avg_memory: 700, total_requests: 5 });
});

test('handles strings containing numeric values and ignores malformed values', () => {
  assert.deepEqual(summarizeMetrics([
    { cpu_usage: '10.5', memory_usage: '512', requests_total: '8' },
    { cpu_usage: 'bad', memory_usage: undefined, requests_total: 'NaN' }
  ]), { avg_cpu: 10.5, avg_memory: 512, total_requests: 8 });
});

test('normalizes invalid legacy fields to null without mutating source rows', () => {
  const source = [{
    id: 9, cpu_usage: 101, memory_usage: -1, requests_total: 10,
    errors_total: 11, response_time_ms: 1000000, timestamp: '2026-10-31T12:00:00Z'
  }];
  const [row] = sanitizeMetricRecords(source);
  assert.deepEqual({
    cpu_usage: row.cpu_usage,
    memory_usage: row.memory_usage,
    requests_total: row.requests_total,
    errors_total: row.errors_total,
    response_time_ms: row.response_time_ms,
    timestamp: row.timestamp
  }, {
    cpu_usage: null,
    memory_usage: null,
    requests_total: 10,
    errors_total: null,
    response_time_ms: null,
    timestamp: '2026-10-31T12:00:00Z'
  });
  assert.equal(source[0].cpu_usage, 101);
});

test('preserves valid telemetry values and nulls only unavailable fields', () => {
  assert.deepEqual(sanitizeMetricRecords([{
    cpu_usage: 23.5, memory_usage: 512, requests_total: 80,
    errors_total: 3, response_time_ms: 47.25
  }]), [{
    cpu_usage: 23.5, memory_usage: 512, requests_total: 80,
    errors_total: 3, response_time_ms: 47.25
  }]);
});

test('returns a zeroed summary for empty and malformed input', () => {
  const empty = { avg_cpu: null, avg_memory: null, total_requests: null };
  assert.deepEqual(summarizeMetrics(null), empty);
  assert.deepEqual(summarizeMetrics([null, 'bad', []]), empty);
});

test('preserves real zero measurements while marking absent fields as unavailable', () => {
  assert.deepEqual(summarizeMetrics([
    { cpu_usage: 0, memory_usage: null, requests_total: 0 }
  ]), { avg_cpu: 0, avg_memory: null, total_requests: 0 });
});

test('does not mutate the source telemetry rows', () => {
  const source = [{ cpu_usage: 20, memory_usage: 100, requests_total: 3 }];
  const before = JSON.stringify(source);
  summarizeMetrics(source);
  assert.equal(JSON.stringify(source), before);
});


test('ignores malformed rows and non-finite measurements without producing NaN totals', () => {
  const summary = summarizeMetrics([
    null,
    [],
    { cpu_usage: 'NaN', memory_usage: 'Infinity', requests_total: 'not-a-number' },
    { cpu_usage: 30, memory_usage: 512, requests_total: 10 }
  ]);
  assert.deepEqual(summary, { avg_cpu: 30, avg_memory: 512, total_requests: 10 });
});

test('does not coerce booleans, arrays, objects, or blank strings into measurements', () => {
  assert.deepEqual(summarizeMetrics([
    { cpu_usage: true, memory_usage: [], requests_total: {} },
    { cpu_usage: ' ', memory_usage: -1, requests_total: -2 },
    { cpu_usage: 101, memory_usage: 1.5, requests_total: 2.5 }
  ]), { avg_cpu: null, avg_memory: null, total_requests: null });
});

test('ignores values outside the telemetry API field domains', () => {
  assert.deepEqual(summarizeMetrics([
    { cpu_usage: -1, memory_usage: 2147483648, requests_total: 2147483648 },
    { cpu_usage: 80, memory_usage: 1024, requests_total: 12 }
  ]), { avg_cpu: 80, avg_memory: 1024, total_requests: 12 });
});
