import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvCell, serializeCsv } from './csv.js';
import { buildDeploymentCsv } from './deploymentExport.js';
import { buildInstanceCsv } from './instanceExport.js';
import { buildMetricsCsv } from './metricsExport.js';
import { buildProjectCsv } from './projectExport.js';
import { buildTeamCsv } from './teamExport.js';

test('all workspace CSV exporters neutralize formula-leading cells', () => {
  assert.ok(buildProjectCsv([{ id: 1, name: '=1+1' }]).includes("'=1+1"));
  assert.ok(buildDeploymentCsv([{ id: 2, version: '+2+2' }]).includes("'+2+2"));
  assert.ok(buildTeamCsv([{ id: 3, name: '@SUM(A1:A2)' }]).includes("'@SUM"));
  assert.ok(buildInstanceCsv([{ id: 4, name: '-cmd' }]).includes("'-cmd"));
  assert.ok(buildMetricsCsv([{ id: 5, cpu_usage: 10 }], { id: 6, name: '=hidden' }).includes("'=hidden"));
});

test('CSV exporters quote delimiters and double embedded quotes', () => {
  const csv = buildDeploymentCsv([{
    id: 1, project_name: 'API, "primary"', version: '1.0.0', branch: 'feature/a',
    status: 'completed', created_at: '2026-10-01T10:00:00Z'
  }]);
  assert.ok(csv.includes('"API, ""primary"""'));
});

test('CSV exporters tolerate missing and malformed collection inputs', () => {
  assert.equal(buildProjectCsv(null).split('\r\n').length, 2);
  assert.equal(buildDeploymentCsv([null, 'bad', []]).includes('bad'), false);
  assert.equal(buildTeamCsv({}).split('\r\n').length, 2);
  assert.equal(buildInstanceCsv(undefined).split('\r\n').length, 2);
  assert.equal(buildMetricsCsv(undefined).split('\r\n').length, 2);
});

test('shared CSV cell serializer neutralizes formula prefixes after control whitespace', () => {
  for (const prefix of ['=', '+', '-', '@']) {
    assert.equal(csvCell('\t\r ' + prefix + 'formula'), "'\t\r " + prefix + 'formula');
  }
});

test('shared CSV cell serializer normalizes nullish values to empty cells', () => {
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
});

test('shared CSV cell serializer doubles embedded quotes', () => {
  assert.equal(csvCell('say "hello"'), '"say ""hello"""');
});

test('shared CSV cell serializer quotes commas', () => {
  assert.equal(csvCell('one,two'), '"one,two"');
});

test('shared CSV cell serializer quotes line breaks and preserves them', () => {
  assert.equal(csvCell('first\nsecond'), '"first\nsecond"');
});

test('shared CSV serializer emits UTF-8 BOM and CRLF row endings', () => {
  const csv = serializeCsv(['Name'], [['Atlas'], ['Beacon']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.endsWith('\r\n'));
  assert.equal(csv, '\uFEFFName\r\nAtlas\r\nBeacon\r\n');
});

test('shared CSV cell serializer neutralizes a formula after a null byte', () => {
  assert.equal(csvCell('\u0000=SUM(A1:A2)'), "'\u0000=SUM(A1:A2)");
});

test('shared CSV cell serializer preserves harmless leading whitespace', () => {
  assert.equal(csvCell('  ordinary text'), '  ordinary text');
});
