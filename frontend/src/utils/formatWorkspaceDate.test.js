import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatWorkspaceDate } from './formatWorkspaceDate.js';

test('renders absent and malformed workspace dates as a dash', () => {
  for (const value of [null, undefined, '', 'invalid date', '2026-15-70']) {
    assert.equal(formatWorkspaceDate(value), '—');
    assert.equal(formatWorkspaceDate(value, { dateOnly: true }), '—');
  }
});

test('formats valid workspace dates with and without the time component', () => {
  const value = '2026-10-31T12:34:56.000Z';
  const date = new Date(value);
  assert.equal(formatWorkspaceDate(value), date.toLocaleString());
  assert.equal(formatWorkspaceDate(value, { dateOnly: true }), date.toLocaleDateString());
});


test('treats date-only ISO values as local calendar dates across time zones', () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const expectedDate = new Date(2026, 9, 31);
    assert.equal(
      formatWorkspaceDate('2026-10-31', { dateOnly: true }),
      expectedDate.toLocaleDateString()
    );
    assert.equal(
      formatWorkspaceDate('2026-10-31'),
      expectedDate.toLocaleString()
    );
    assert.equal(formatWorkspaceDate('2026-02-30', { dateOnly: true }), '—');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
