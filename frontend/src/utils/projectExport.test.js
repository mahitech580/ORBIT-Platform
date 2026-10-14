import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildProjectCsv } from './projectExport.js';

test('exports project inventory with a BOM and stable columns', () => {
  const csv = buildProjectCsv([{
    id: 7, name: 'Aster', description: 'API workspace', runtime: 'python',
    status: 'active', team_name: 'Platform', created_at: '2026-10-01',
    updated_at: '2026-10-02'
  }]);
  assert.ok(csv.startsWith('\uFEFFProject ID,Name,Description,Runtime,Status,Team,Created At,Updated At\r\n'));
  assert.ok(csv.includes('7,Aster,API workspace,python,active,Platform,2026-10-01,2026-10-02\r\n'));
});

test('quotes commas quotes and newlines and preserves embedded quotes', () => {
  const csv = buildProjectCsv([{
    id: 1, name: 'Aster, "Core"', description: 'Line one\nLine two',
    runtime: 'node', status: 'active'
  }]);
  assert.ok(csv.includes('1,"Aster, ""Core""","Line one\nLine two",node,active,,,'));
});

test('neutralizes spreadsheet formula prefixes in project text cells', () => {
  const csv = buildProjectCsv([
    { id: 1, name: '=IMPORTXML("x")' },
    { id: 2, name: '   +SUM(1,2)' },
    { id: 3, description: '@malicious' },
    { id: 4, team_name: '-cmd' }
  ]);
  assert.ok(csv.includes("'=IMPORTXML"));
  assert.ok(csv.includes("   '+SUM"));
  assert.ok(csv.includes("'@malicious"));
  assert.ok(csv.includes("'-cmd"));
});

test('handles missing and malformed input without throwing', () => {
  assert.equal(buildProjectCsv(null).split('\r\n').length, 2);
  assert.equal(buildProjectCsv([{ id: 1, name: 'Valid' }, null, 'bad', []]).includes('Valid'), true);
  assert.equal(buildProjectCsv([{ id: 1, name: 'Valid' }, null, 'bad', []]).includes('bad'), false);
});
