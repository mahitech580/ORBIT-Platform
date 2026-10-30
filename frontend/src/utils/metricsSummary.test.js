import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeMetrics } from './metricsSummary.js';

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
