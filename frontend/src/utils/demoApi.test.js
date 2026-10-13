import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { createDemoApi, demoStorageKey } from './demoApi.js';

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
