import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInstanceCsv } from './instanceExport.js';

test('exports instance metadata and resolves project labels', () => {
  const csv = buildInstanceCsv([{
    id: 8, name: 'worker-01', project_id: 3, deployment_id: 9, instance_type: 'small',
    status: 'running', created_at: '2026-10-14T10:00:00.000Z'
  }], [{ id: 3, name: 'Compute API' }]);
  assert.ok(csv.startsWith('\uFEFFInstance ID,Name,Project ID,Project,Instance Type,Status,Deployment ID,Created At\r\n'));
  assert.ok(csv.includes('8,worker-01,3,Compute API,small,running,9,2026-10-14T10:00:00.000Z\r\n'));
});

test('prefers the denormalized project name when present', () => {
  const csv = buildInstanceCsv([{ id: 1, project_id: 3, project_name: 'Stored API', name: 'worker' }], [{ id: 3, name: 'Current API' }]);
  assert.ok(csv.includes(',Stored API,'));
});

test('neutralizes spreadsheet formula prefixes and escapes quotes', () => {
  const csv = buildInstanceCsv([{ id: 1, name: '=1+1' }], []);
  assert.ok(csv.includes("'=1+1"));
});
test('handles empty or malformed instance input', () => {
  assert.equal(buildInstanceCsv(null).split('\r\n').length, 2);
  assert.equal(buildInstanceCsv([null, 'bad', []]).includes('bad'), false);
});
