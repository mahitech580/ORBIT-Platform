import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkspaceExport, serializeMetricsCsv } from './workspaceExport.js';

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


test('exports telemetry with a stable schema and preserves recorded values', () => {
  const csv = serializeMetricsCsv([
    {
      id: 1,
      timestamp: '2026-10-14T06:00:00.000Z',
      cpu_usage: 12.5,
      memory_usage: 512,
      requests_total: 20,
      errors_total: 1,
      response_time_ms: 87
    }
  ], 'Payments, API');

  assert.ok(csv.startsWith('"project_name","timestamp","cpu_usage","memory_usage","requests_total","errors_total","response_time_ms"\r\n'));
  assert.ok(csv.includes('"Payments, API","2026-10-14T06:00:00.000Z","12.5","512","20","1","87"\r\n'));
  assert.ok(csv.endsWith('\r\n'));
});

test('neutralizes formula-like project names and string metrics', () => {
  const csv = serializeMetricsCsv([{
    timestamp: '=HYPERLINK("https://example.invalid","open")',
    cpu_usage: '+SUM(1,2)',
    memory_usage: -1,
    requests_total: 0
  }], '@report');

  assert.ok(csv.includes("\"'@report\""));
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"https://example.invalid\"\",\"\"open\"\")\""));
  assert.ok(csv.includes("\"'+SUM(1,2)\""));
  // Numeric negatives remain usable as numeric data, not prefixed as text.
  assert.ok(csv.includes('"-1"'));
});

test('empty, missing, and malformed telemetry return only the header', () => {
  const header = '"project_name","timestamp","cpu_usage","memory_usage","requests_total","errors_total","response_time_ms"\r\n';
  assert.equal(serializeMetricsCsv([], 'API'), header);
  assert.equal(serializeMetricsCsv(null, 'API'), header);
  assert.equal(serializeMetricsCsv([null, 3, 'bad', []], 'API'), header);
});
