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

test('returns per-team project counts from a fresh owned browser-demo workspace', async () => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.localStorage.setItem('token', 'orbit-pages-demo-1-test');
  globalThis.localStorage.setItem('orbit.user', JSON.stringify({
    id: 1, email: 'demo@orbit.local', username: 'demo', name: 'Demo User'
  }));

  globalThis.localStorage.setItem(demoStorageKey, JSON.stringify({
    nextProjectId: 4,
    nextDeploymentId: 1,
    nextTeamId: 3,
    nextInstanceId: 1,
    accounts: [],
    teams: [
      { id: 1, owner_id: 1, name: 'My team', description: '' },
      { id: 2, owner_id: 2, name: 'Another owner team', description: '' }
    ],
    projects: [
      { id: 1, owner_id: 1, team_id: 1, name: 'API', runtime: 'node', status: 'active' },
      { id: 2, owner_id: 1, team_id: 1, name: 'Console', runtime: 'node', status: 'archived' },
      { id: 3, owner_id: 2, team_id: 2, name: 'Private project', runtime: 'python', status: 'active' }
    ],
    deployments: [],
    instances: [],
    metrics: {}
  }));

  const api = createDemoApi();
  const teams = (await api.get('/teams')).data.teams;
  assert.equal(teams.length, 1);
  assert.equal(teams[0].name, 'My team');
  assert.equal(teams[0].project_count, 2);
});
