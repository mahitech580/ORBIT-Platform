import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDemoApi, demoStorageKey } from './demoApi.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

afterEach(() => {
  delete globalThis.localStorage;
});

test('repairs malformed optional collections and next-ID counters in saved browser data', async () => {
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;
  storage.setItem(demoStorageKey, JSON.stringify({
    projects: [{ id: 9, owner_id: 1, name: 'Existing', status: 'active', runtime: 'node' }],
    deployments: [{ id: 7, project_id: 9, version: '1.0.0', branch: 'main', status: 'completed' }],
    teams: 'not-an-array',
    instances: null,
    accounts: {},
    metrics: [],
    nextProjectId: 1,
    nextDeploymentId: 1,
    nextTeamId: -1,
    nextInstanceId: 0
  }));

  const api = createDemoApi();
  assert.deepEqual((await api.get('/teams')).data.teams, []);
  const created = await api.post('/projects', {
    name: 'After recovery',
    description: 'Checks repaired ID counters',
    runtime: 'python'
  });
  assert.ok(created.data.project.id > 9);
  const state = JSON.parse(storage.getItem(demoStorageKey));
  assert.ok(state.nextProjectId > created.data.project.id);
});
