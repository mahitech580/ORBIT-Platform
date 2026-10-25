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

test('redacts credential patterns embedded in free-text backup fields', () => {
  const providerKey = 'sk-' + 'abcdefghijklmnopqrstuvwxyz123456';
  const githubToken = 'ghp_' + 'A'.repeat(30);
  const bearerToken = 'Bearer ' + 'abcDEF1234567890_tokenValue987654321';
  const awsKey = 'AKIA' + '1234567890ABCDEF';
  const truncatedPem = '-----BEGIN PRIVATE KEY-----\\nprivate-material-that-must-not-escape';
  const snapshot = buildWorkspaceExport({
    projects: [{
      id: 1,
      name: 'Sensitive text review',
      description: [providerKey, githubToken, bearerToken, awsKey, truncatedPem].join('\\n')
    }]
  }, 't');
  const exported = JSON.stringify(snapshot);
  for (const secret of [providerKey, githubToken, bearerToken, awsKey, 'private-material-that-must-not-escape']) {
    assert.equal(exported.includes(secret), false);
  }
  assert.match(snapshot.records.projects[0].description, /REDACTED: provider key/);
  assert.match(snapshot.records.projects[0].description, /REDACTED: GitHub token/);
  assert.match(snapshot.records.projects[0].description, /REDACTED: bearer token/);
  assert.match(snapshot.records.projects[0].description, /REDACTED: AWS access key/);
  assert.match(snapshot.records.projects[0].description, /REDACTED: private-key block/);
});

test('redacts credential assignments embedded in operational descriptions', () => {
  const rawValues = [
    'DATABASE_PASSWORD=hunter2-private',
    'client_secret:very-private-value',
    'api_key = another-private-value',
    'password=abc',
    'token:x',
    'AUTHORIZATION=ok'
  ];
  const snapshot = buildWorkspaceExport({
    projects: [{ id: 2, name: 'Connector setup', description: rawValues.join('; ') }]
  }, 't');
  const description = snapshot.records.projects[0].description;
  for (const raw of rawValues) assert.equal(description.includes(raw), false);
  assert.equal((description.match(/REDACTED: credential assignment/g) || []).length, 6);
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


test('accepts a structurally valid version-one backup', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', runtime: 'python', status: 'active' }], deployments: [], teams: [], instances: [] }, 't');
  assert.deepEqual(validateWorkspaceBackup(snapshot), {
    valid: true, errors: [], counts: { projects: 1, deployments: 0, teams: 0, instances: 0 }
  });
});

test('rejects a file with an unrelated format or unsupported schema', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  assert.equal(validateWorkspaceBackup({ ...base, format: 'OTHER' }).valid, false);
  assert.ok(validateWorkspaceBackup({ ...base, schema_version: 99 }).errors.some(error => error.includes('schema')));
});

test('rejects missing collections and non-object records', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  assert.equal(validateWorkspaceBackup({ ...base, records: { ...base.records, teams: null } }).valid, false);
  assert.ok(validateWorkspaceBackup({ ...base, records: { ...base.records, projects: [null] } }).errors.some(error => error.includes('record objects')));
});

test('rejects inconsistent backup count summaries', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({ projects: [{ id: 1 }] }, 't');
  const corrupted = { ...base, counts: { ...base.counts, projects: 8 } };
  assert.equal(validateWorkspaceBackup(corrupted).valid, false);
  assert.ok(validateWorkspaceBackup(corrupted).errors.some(error => error.includes('count does not match')));
});

test('rejects oversized backups before inspecting individual records', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const projects = Array.from({ length: 10001 }, (_, index) => ({
    id: index + 1,
    name: 'Project ' + (index + 1)
  }));
  const oversized = buildWorkspaceExport({ projects }, 't');
  const result = validateWorkspaceBackup(oversized);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('maximum of 10000 records')));
  assert.equal(result.counts.projects, 10001);
});

test('returns a stable validation error for primitive input', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  assert.deepEqual(validateWorkspaceBackup(null), {
    valid: false, errors: ['The backup must be a JSON object.'], counts: null
  });
});


test('rejects a project linked to a team missing from the backup', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    teams: [{ id: 1, name: 'Known Team' }],
    projects: [{ id: 2, team_id: 99, name: 'Dangling project', runtime: 'python', status: 'active' }]
  }, 't');
  const result = validateWorkspaceBackup(snapshot);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('team missing from the backup')));
});

test('accepts consistent numeric string references in backup records', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    teams: [{ id: 5, name: 'Team Five' }],
    projects: [{ id: 6, team_id: '5', name: 'Typed reference', runtime: 'node', status: 'active' }]
  }, 't');
  assert.equal(validateWorkspaceBackup(snapshot).valid, true);
});

test('rejects an instance whose deployment belongs to a different project', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    teams: [{ id: 1, name: 'Team One' }],
    projects: [
      { id: 10, team_id: 1, name: 'Project A', runtime: 'node', status: 'active' },
      { id: 11, team_id: 1, name: 'Project B', runtime: 'python', status: 'active' }
    ],
    deployments: [
      { id: 20, project_id: 10, version: '1.0.0', branch: 'main' },
      { id: 21, project_id: 11, version: '1.0.0', branch: 'main' }
    ],
    instances: [{ id: 30, project_id: 10, deployment_id: 21, name: 'mismatched-instance' }]
  }, 't');
  const result = validateWorkspaceBackup(snapshot);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('deployment belonging to another project')));
});

test('rejects an instance with a missing deployment reference before restore', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    teams: [{ id: 1, name: 'Team One' }],
    projects: [{ id: 10, team_id: 1, name: 'Project A', runtime: 'node', status: 'active' }],
    instances: [{ id: 30, project_id: 10, name: 'orphan-instance' }]
  }, 't');
  const result = validateWorkspaceBackup(snapshot);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('missing a deployment reference')));
});

test('accepts an instance with matching project and deployment references', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    teams: [{ id: 1, name: 'Team One' }],
    projects: [{ id: 10, team_id: 1, name: 'Project A', runtime: 'node', status: 'active' }],
    deployments: [{ id: 20, project_id: 10, version: '1.0.0', branch: 'main' }],
    instances: [{ id: 30, project_id: 10, deployment_id: 20, name: 'valid-instance' }]
  }, 't');
  assert.equal(validateWorkspaceBackup(snapshot).valid, true);
});

test('rejects an array as the entire backup document', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  assert.equal(validateWorkspaceBackup([]).valid, false);
});

test('rejects a numeric backup document', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  assert.equal(validateWorkspaceBackup(42).valid, false);
});

test('rejects a backup without its records member', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  const result = validateWorkspaceBackup({ ...base, records: undefined });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('records object')));
});

test('rejects an array used as the records container', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  assert.equal(validateWorkspaceBackup({ ...base, records: [] }).valid, false);
});

test('rejects a project collection that is not an array', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  const result = validateWorkspaceBackup({ ...base, records: { ...base.records, projects: {} } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('"projects" collection must be an array')));
});

test('rejects a missing count summary', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  assert.equal(validateWorkspaceBackup({ ...base, counts: undefined }).valid, false);
});

test('rejects a count summary missing a collection key', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const base = buildWorkspaceExport({}, 't');
  const result = validateWorkspaceBackup({ ...base, counts: { projects: 0 } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('count summary is incomplete')));
});

test('rejects whitespace-only project names in imported backups', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: '   ', runtime: 'node', status: 'active' }] }, 't');
  const result = validateWorkspaceBackup(snapshot);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('invalid name')));
});

test('rejects project names longer than the API contract', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'P'.repeat(121) }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid name')));
});

test('rejects a non-string project description', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', description: 99 }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid description')));
});

test('rejects project descriptions over the documented limit', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', description: 'x'.repeat(2001) }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid description')));
});

test('accepts a supported runtime regardless of letter case', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', runtime: 'PYTHON', status: 'active' }] }, 't');
  assert.equal(validateWorkspaceBackup(snapshot).valid, true);
});

test('rejects unsupported project runtimes', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', runtime: 'fortran' }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('unsupported runtime')));
});

test('rejects unsupported project status values', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', status: 'deleted' }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('unsupported status')));
});

test('accepts supported project status regardless of letter case', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 1, name: 'Atlas', status: 'ARCHIVED' }] }, 't');
  assert.equal(validateWorkspaceBackup(snapshot).valid, true);
});

test('rejects whitespace-only team names', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ teams: [{ id: 1, name: '   ' }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('Team record 1 has an invalid name')));
});

test('rejects team names longer than the documented limit', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ teams: [{ id: 1, name: 'T'.repeat(121) }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('Team record 1 has an invalid name')));
});

test('rejects deployment records without a usable project reference', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ deployments: [{ id: 1, version: '1.0.0' }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid project reference')));
});

test('rejects a team description longer than the API contract', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ teams: [{ id: 1, name: 'Operations', description: 'x'.repeat(2001) }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid description')));
});

test('rejects an instance type longer than the API contract', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ instances: [{ id: 1, project_id: 1, deployment_id: 1, name: 'worker', instance_type: 't'.repeat(81) }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid instance type')));
});

test('accepts an instance type at the API length boundary', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    teams: [{ id: 1, name: 'Operations' }],
    projects: [{ id: 10, team_id: 1, name: 'Atlas', runtime: 'node', status: 'active' }],
    deployments: [{ id: 20, project_id: 10, version: '1.0.0', branch: 'main' }],
    instances: [{ id: 30, project_id: 10, deployment_id: 20, name: 'worker', instance_type: 't'.repeat(80) }]
  }, 't');
  assert.equal(validateWorkspaceBackup(snapshot).valid, true);
});

test('rejects duplicate project IDs in imported snapshots', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [
    { id: 1, name: 'Atlas', runtime: 'node', status: 'active' },
    { id: 1, name: 'Beacon', runtime: 'python', status: 'active' }
  ] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('Project records contain duplicate ID 1')));
});

test('rejects duplicate team IDs in imported snapshots', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ teams: [
    { id: 7, name: 'Operations' },
    { id: 7, name: 'Engineering' }
  ] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('Team records contain duplicate ID 7')));
});

test('rejects duplicate deployment IDs in imported snapshots', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    projects: [{ id: 1, name: 'Atlas', runtime: 'node', status: 'active' }],
    deployments: [
      { id: 9, project_id: 1, version: '1.0.0', branch: 'main' },
      { id: 9, project_id: 1, version: '2.0.0', branch: 'main' }
    ]
  }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('Deployment records contain duplicate ID 9')));
});

test('rejects duplicate instance IDs in imported snapshots', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({
    projects: [{ id: 1, name: 'Atlas', runtime: 'node', status: 'active' }],
    deployments: [{ id: 2, project_id: 1, version: '1.0.0', branch: 'main' }],
    instances: [
      { id: 3, project_id: 1, deployment_id: 2, name: 'worker-a' },
      { id: 3, project_id: 1, deployment_id: 2, name: 'worker-b' }
    ]
  }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('Instance records contain duplicate ID 3')));
});

test('rejects zero-valued record IDs in backups', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ projects: [{ id: 0, name: 'Atlas', runtime: 'node', status: 'active' }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid ID')));
});

test('rejects negative record IDs in backups', async () => {
  const { validateWorkspaceBackup } = await import('./workspaceExport.js');
  const snapshot = buildWorkspaceExport({ teams: [{ id: -4, name: 'Operations' }] }, 't');
  assert.ok(validateWorkspaceBackup(snapshot).errors.some(error => error.includes('invalid ID')));
});
