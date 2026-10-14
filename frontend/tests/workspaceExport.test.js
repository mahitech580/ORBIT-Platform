import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceExport, serializeWorkspaceExport } from '../src/utils/workspaceExport.js';

test('exports all supported workspace collections with a stable schema', () => {
  const workspace = { projects: [{ id: 1 }], deployments: [{ id: 2 }], teams: [{ id: 3 }], instances: [{ id: 4 }] };
  const result = createWorkspaceExport(workspace, '2026-10-14T00:00:00.000Z');
  assert.equal(result.format, 'orbit-workspace-export');
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.exportedAt, '2026-10-14T00:00:00.000Z');
  assert.deepEqual(result.collections.projects, [{ id: 1 }]);
  assert.deepEqual(result.collections.deployments, [{ id: 2 }]);
  assert.deepEqual(result.collections.teams, [{ id: 3 }]);
  assert.deepEqual(result.collections.instances, [{ id: 4 }]);
});

test('missing or malformed collections become empty arrays', () => {
  assert.deepEqual(createWorkspaceExport({ projects: 'not-an-array' }).collections, {
    projects: [], deployments: [], teams: [], instances: []
  });
});

test('serialized export is valid pretty JSON and excludes unrelated session fields', () => {
  const text = serializeWorkspaceExport({ projects: [], token: 'secret', password: 'secret' }, '2026-01-01T00:00:00.000Z');
  const parsed = JSON.parse(text);
  assert.equal(parsed.collections.projects.length, 0);
  assert.equal('token' in parsed, false);
  assert.equal('password' in parsed, false);
  assert.ok(text.endsWith('\n'));
});


import { serializeWorkspaceCsv } from '../src/utils/workspaceExport.js';

test('CSV export includes record types, safely quotes cells, and preserves stable headers', () => {
  const csv = serializeWorkspaceCsv({
    projects: [{
      id: 7,
      name: 'App, "Production"',
      description: 'first line\nsecond line',
      record_type: 'forged'
    }],
    deployments: [{ id: 9, branch: '=SUM(1,2)' }],
    teams: [],
    instances: []
  });
  assert.ok(csv.startsWith('"record_type",'));
  assert.ok(csv.includes('"App, ""Production"""'));
  assert.ok(csv.includes('"first line\nsecond line"'));
  assert.ok(csv.includes('"\x27=SUM(1,2)"'));
  assert.ok(csv.includes('"projects"'));
  assert.ok(!csv.includes('"forged"'));
  assert.ok(csv.endsWith('\r\n'));
});

test('CSV export safely handles empty input and ignores malformed rows', () => {
  assert.equal(serializeWorkspaceCsv(null), '"record_type"\r\n');
  assert.equal(serializeWorkspaceCsv({ projects: [null, 1, 'bad', []] }), '"record_type"\r\n');
});
