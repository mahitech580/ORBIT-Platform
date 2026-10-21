import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { createDemoApi, demoStorageKey } from './demoApi.js';
import { buildWorkspaceExport } from './workspaceExport.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

let storage;
let api;

beforeEach(() => {
  storage = new MemoryStorage();
  globalThis.localStorage = storage;
  api = createDemoApi();
});

afterEach(() => {
  delete globalThis.localStorage;
});

test('seeds a demo workspace and sample metrics', async () => {
  const result = await api.get('/projects');
  assert.equal(result.data.projects.length, 3);
  const metrics = await api.get('/metrics/1');
  assert.equal(metrics.data.metrics.length, 8);
  assert.ok(metrics.data.summary.avg_cpu > 0);
  assert.ok(storage.getItem(demoStorageKey));
});

test('creates, updates, and archives a project', async () => {
  const created = await api.post('/projects', { name: 'Test project', description: 'A temporary project', runtime: 'python' });
  const id = created.data.project.id;
  assert.equal(created.status, 201);
  assert.equal(created.data.project.name, 'Test project');
  await api.put('/projects/' + id, { name: 'Updated project', status: 'archived', runtime: 'python' });
  const result = await api.get('/projects');
  const project = result.data.projects.find(item => item.id === id);
  assert.equal(project.name, 'Updated project');
  assert.equal(project.status, 'archived');
});

test('deployment records are visible in the deployment list', async () => {
  const created = await api.post('/projects/1/deploy', { version: '2.0.0', branch: 'main' });
  assert.equal(created.status, 201);
  assert.match(created.data.message, /No build or cloud resource/);
  const list = await api.get('/deployments');
  assert.ok(list.data.deployments.some(item => item.id === created.data.deployment.id));
});


test('creates and lists instance metadata linked to a deployment record', async () => {
  const release = await api.post('/projects/1/deploy', { version: '4.1.0', branch: 'main' });
  const saved = await api.post('/instances', {
    project_id: 1,
    deployment_id: release.data.deployment.id,
    name: 'api-worker-01',
    instance_type: 't3.small'
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.instance.name, 'api-worker-01');
  const list = await api.get('/instances');
  assert.ok(list.data.instances.some(item => item.id === saved.data.instance.id && item.project_name === 'Sample App'));
});

test('deleting a project also removes its deployments and metrics', async () => {
  await api.post('/projects/1/deploy', { version: '3.0.0', branch: 'test' });
  await api.delete('/projects/1');
  const projects = await api.get('/projects');
  const deployments = await api.get('/deployments');
  assert.ok(!projects.data.projects.some(item => item.id === 1));
  assert.ok(!deployments.data.deployments.some(item => item.project_id === 1));
  await assert.rejects(() => api.get('/metrics/1'), error => error.response.status === 404);
});

test('rejects invalid project payloads', async () => {
  await assert.rejects(() => api.post('/projects', { name: '', runtime: 'fortran' }), error => error.response.status === 400);
});

test('demo sign-in accepts the documented credentials and rejects bad passwords', async () => {
  const result = await api.post('/auth/login', { email: 'demo@orbit.local', password: 'demo123' });
  assert.ok(result.data.token.startsWith('orbit-pages-demo-'));
  await assert.rejects(() => api.post('/auth/login', { email: 'demo@orbit.local', password: 'wrong' }), error => error.response.status === 401);
});

test('registration cannot claim the reserved built-in demo email', async () => {
  await assert.rejects(() => api.post('/auth/register', {
    email: 'DEMO@ORBIT.LOCAL',
    username: 'another_demo',
    password: 'valid-password-123'
  }), error => error.response.status === 400);
  const login = await api.post('/auth/login', {
    email: 'demo@orbit.local',
    password: 'demo123'
  });
  assert.equal(login.data.user.id, 1);
});


test('restores a validated backup while remapping project and deployment references', async () => {
  const backup = buildWorkspaceExport({
    mode: 'browser-demo',
    teams: [{ id: 10, name: 'Restored Team', description: 'Restored workspace team' }],
    projects: [{
      id: 20, team_id: 10, name: 'Restored API', description: 'Imported project',
      runtime: 'python', status: 'active', created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-02T10:00:00.000Z'
    }],
    deployments: [{
      id: 30, project_id: 20, project_name: 'Restored API', version: '2.1.0',
      branch: 'main', status: 'completed', created_at: '2026-10-03T10:00:00.000Z',
      completed_at: '2026-10-03T10:02:00.000Z'
    }],
    instances: [{
      id: 40, project_id: 20, deployment_id: 30, name: 'restored-worker',
      instance_type: 'small', status: 'running', created_at: '2026-10-03T10:03:00.000Z'
    }]
  }, '2026-10-14T06:00:00.000Z');

  const result = await api.restoreWorkspace(backup);
  assert.equal(result.data.success, true);
  assert.deepEqual(result.data.restored, { projects: 1, deployments: 1, teams: 1, instances: 1 });
  const projects = (await api.get('/projects')).data.projects;
  const deployments = (await api.get('/deployments')).data.deployments;
  const teams = (await api.get('/teams')).data.teams;
  const instances = (await api.get('/instances')).data.instances;
  assert.deepEqual(projects.map(project => project.name), ['Restored API']);
  assert.equal(deployments[0].project_id, projects[0].id);
  assert.equal(instances[0].project_id, projects[0].id);
  assert.equal(instances[0].deployment_id, deployments[0].id);
  assert.equal(teams[0].name, 'Restored Team');
  assert.match(result.data.notice, /Metrics are not included/);
});

test('rejects an invalid backup before changing existing demo workspace state', async () => {
  const before = (await api.get('/projects')).data.projects.map(project => project.id);
  const invalid = { format: 'ORBIT_WORKSPACE_BACKUP', schema_version: 99, records: {}, counts: {} };
  await assert.rejects(() => api.restoreWorkspace(invalid), error => error.response.status === 400);
  const after = (await api.get('/projects')).data.projects.map(project => project.id);
  assert.deepEqual(after, before);
});

test("restoring an empty backup clears the current demo user records", async () => {
  const emptyBackup = buildWorkspaceExport({}, 'fixed-time');
  const result = await api.restoreWorkspace(emptyBackup);
  assert.deepEqual(result.data.restored, { projects: 0, deployments: 0, teams: 0, instances: 0 });
  assert.deepEqual((await api.get('/projects')).data.projects, []);
  assert.deepEqual((await api.get('/deployments')).data.deployments, []);
  assert.deepEqual((await api.get('/instances')).data.instances, []);
});


test('registration creates a browser account and its default team', async () => {
  const result = await api.post('/auth/register', {
    email: 'fresh-member@example.com',
    username: 'fresh_member',
    password: 'membership-password-123',
    first_name: 'Fresh'
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.user.email, 'fresh-member@example.com');
  assert.equal(result.data.user.name, 'Fresh');
  const state = JSON.parse(storage.getItem(demoStorageKey));
  assert.ok(state.accounts.some(account => account.email === 'fresh-member@example.com'));
  assert.ok(state.teams.some(team => team.owner_id === result.data.user.id && team.name === 'Default Team'));
});
