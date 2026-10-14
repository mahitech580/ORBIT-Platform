import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMetricsCsv } from './metricsExport.js';

test('exports selected-project measurement data with units in the header', () => {
  const csv = buildMetricsCsv([{
    timestamp: '2026-10-14T10:00:00.000Z', cpu_usage: 43.5, memory_usage: 512,
    requests_total: 170, errors_total: 2, response_time_ms: 142
  }], { id: 12, name: 'API Service' });
  assert.ok(csv.startsWith('\uFEFFProject ID,Project,Timestamp,CPU Usage (%),Memory (MB),Requests Total,Errors Total,Response Time (ms)\r\n'));
  assert.ok(csv.includes('12,API Service,2026-10-14T10:00:00.000Z,43.5,512,170,2,142\r\n'));
});

test('preserves missing measurement values as blank CSV cells', () => {
  const csv = buildMetricsCsv([{ timestamp: 't', cpu_usage: null, errors_total: 0 }], { id: 1, name: 'Worker' });
  assert.ok(csv.includes('1,Worker,t,,,,0,'));
});

test('neutralizes formula-leading project metadata and quotes delimiters', () => {
  const csv = buildMetricsCsv([{ timestamp: 't' }], { id: 1, name: '=IMPORTXML("x,y")' });
  assert.ok(csv.includes('"\'=IMPORTXML(""x,y"")"'));
});

test('handles empty and malformed measurement collections', () => {
  assert.equal(buildMetricsCsv(null, {}).split('\r\n').length, 2);
  assert.equal(buildMetricsCsv([{ timestamp: 't' }, null, 'bad'], {}).includes('bad'), false);
});
