import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDeploymentCsv } from './deploymentExport.js';

test('exports stable columns and resolves project names from workspace records', () => {
  const csv = buildDeploymentCsv([
    {
      id: 14,
      project_id: '2',
      version: '1.3.0',
      branch: 'release/stable',
      status: 'completed',
      created_at: '2026-10-14T08:00:00.000Z',
      completed_at: '2026-10-14T08:02:00.000Z'
    }
  ], [{ id: 2, name: 'Billing API' }]);

  assert.ok(csv.startsWith('\uFEFFDeployment ID,Project,Version,Branch,Status,Created At,Completed At\r\n'));
  assert.ok(csv.includes('14,Billing API,1.3.0,release/stable,completed,2026-10-14T08:00:00.000Z,2026-10-14T08:02:00.000Z\r\n'));
});

test('quotes commas, double-quotes, and newlines according to CSV rules', () => {
  const csv = buildDeploymentCsv([{
    id: 1,
    project_name: 'Payments, "Core"',
    version: '2.0',
    branch: 'feature/line\nbreak',
    status: 'completed'
  }]);

  assert.ok(csv.includes('1,"Payments, ""Core""",2.0,"feature/line\nbreak",completed,,\r\n'));
});

test('neutralizes formula-like user-controlled text before spreadsheet export', () => {
  const csv = buildDeploymentCsv([{
    id: 3,
    project_name: '  =1+1',
    version: '+SUM(1,1)',
    branch: '\t@malicious',
    status: '-pending'
  }]);

  assert.ok(csv.includes("'  =1+1"));
  assert.ok(csv.includes("'+SUM(1,1)"));
  assert.ok(csv.includes("'\t@malicious"));
  assert.ok(csv.includes("'-pending"));
});

test('handles missing and malformed collections without mutating the source records', () => {
  const source = [
    { id: 8, project_id: 99, version: '1.0', branch: 'main', status: 'pending' },
    null,
    'malformed',
    []
  ];
  const before = structuredClone(source);
  const csv = buildDeploymentCsv(source, null);

  assert.ok(csv.includes('8,Unknown project,1.0,main,pending,,\r\n'));
  assert.equal(csv.split('\r\n').filter(Boolean).length, 2);
  assert.deepEqual(source, before);
  assert.equal(buildDeploymentCsv(null).split('\r\n').filter(Boolean).length, 1);
});
