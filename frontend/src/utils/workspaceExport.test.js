import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkspaceExport } from './workspaceExport.js';

test('builds a versioned snapshot with record counts and stable metadata', () => {
  const snapshot = buildWorkspaceExport({
    mode: 'browser-demo',
    projects: [{ id: 1, name: 'Atlas' }, { id: 2, name: 'Beacon' }],
    deployments: [{ id: 8, status: 'recorded' }],
    teams: [{ id: 3 }],
    instances: []
  }, '2026-10-14T06:00:00.000Z');

  assert.equal(snapshot.format, 'ORBIT_WORKSPACE_BACKUP');
  assert.equal(snapshot.schema_version, 1);
  assert.equal(snapshot.exported_at, '2026-10-14T06:00:00.000Z');
  assert.equal(snapshot.mode, 'browser-demo');
  assert.deepEqual(snapshot.counts, { projects: 2, deployments: 1, teams: 1, instances: 0 });
  assert.equal(snapshot.records.projects[0].name, 'Atlas');
});

test('removes credential-like fields recursively without mutating source records', () => {
  const project = {
    id: 4,
    name: 'Private API',
    token: 'must-not-export',
    configuration: {
      api_key: 'also-private',
      region: 'ap-south-1',
      nested: [{ password: 'secret', label: 'safe metadata' }]
    }
  };

  const snapshot = buildWorkspaceExport({ projects: [project] }, 'fixed-time');
  assert.equal(snapshot.records.projects[0].name, 'Private API');
  assert.equal('token' in snapshot.records.projects[0], false);
  assert.equal('api_key' in snapshot.records.projects[0].configuration, false);
  assert.equal('password' in snapshot.records.projects[0].configuration.nested[0], false);
  assert.equal(snapshot.records.projects[0].configuration.region, 'ap-south-1');
  assert.equal(project.token, 'must-not-export');
  assert.equal(project.configuration.nested[0].password, 'secret');
});

test('normalizes unexpected record collections to empty arrays', () => {
  const snapshot = buildWorkspaceExport({ projects: null, deployments: 'not-an-array' }, 'fixed-time');
  assert.deepEqual(snapshot.counts, { projects: 0, deployments: 0, teams: 0, instances: 0 });
  assert.deepEqual(snapshot.records.projects, []);
  assert.deepEqual(snapshot.records.deployments, []);
});


test('defaults to the server API mode when mode is omitted', () => {
  assert.equal(buildWorkspaceExport({}, 't').mode, 'server-api');
});
