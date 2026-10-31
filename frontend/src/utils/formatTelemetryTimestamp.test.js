import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatTelemetryTimestamp } from './formatTelemetryTimestamp.js';

test('renders absent and malformed telemetry timestamps as an em dash', () => {
  for (const value of [null, undefined, '', 'not-a-date', '2026-99-44T88:99:00Z']) {
    assert.equal(formatTelemetryTimestamp(value), '—');
    assert.equal(formatTelemetryTimestamp(value, { hour: '2-digit' }, 'time'), '—');
  }
});

test('formats valid date-time and time-only telemetry values', () => {
  const value = '2026-10-31T12:34:56.000Z';
  const date = new Date(value);
  assert.equal(formatTelemetryTimestamp(value), date.toLocaleString());
  assert.equal(
    formatTelemetryTimestamp(value, { hour: '2-digit', minute: '2-digit' }, 'time'),
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
});

test('accepts valid Date objects and rejects invalid Date objects', () => {
  const valid = new Date('2026-10-31T12:34:56.000Z');
  assert.equal(formatTelemetryTimestamp(valid), valid.toLocaleString());
  assert.equal(formatTelemetryTimestamp(new Date(NaN)), '—');
});
