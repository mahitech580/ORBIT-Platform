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
  await api.post('/teams', { name: 'Recovered workspace team' });
  const created = await api.post('/projects', {
    name: 'After recovery',
    description: 'Checks repaired ID counters',
    runtime: 'python'
  });
  assert.ok(created.data.project.id > 9);
  const state = JSON.parse(storage.getItem(demoStorageKey));
  assert.ok(state.nextProjectId > created.data.project.id);
});


test('keeps demo workflows usable when browser storage throws on every access', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('Storage is blocked'); },
    setItem() { throw new Error('Storage quota is unavailable'); },
    removeItem() { throw new Error('Storage is blocked'); }
  };

  const api = createDemoApi();
  const before = await api.get('/projects');
  assert.ok(before.data.projects.length >= 1);

  const created = await api.post('/projects', {
    name: 'Private-window project',
    description: 'Saved in memory for this tab only',
    runtime: 'python'
  });
  assert.equal(created.status, 201);

  const after = await api.get('/projects');
  assert.ok(after.data.projects.some(project => project.name === 'Private-window project'));
});
