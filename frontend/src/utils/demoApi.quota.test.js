import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDemoApi, demoStorageKey } from './utils/demoApi.js';

afterEach(() => {
  delete globalThis.localStorage;
});

test('retains updates in memory instead of resurrecting stale storage after quota errors', async () => {
  const staleState = JSON.stringify({
    nextProjectId: 51,
    nextDeploymentId: 1,
    nextTeamId: 1,
    nextInstanceId: 1,
    accounts: [],
    teams: [],
    projects: [{
      id: 50, owner_id: 1, team_id: null, team_name: 'Personal workspace',
      name: 'Stored project', description: '', runtime: 'node', status: 'active'
    }],
    deployments: [],
    instances: [],
    metrics: {}
  });
  globalThis.localStorage = {
    getItem(key) { return key === demoStorageKey ? staleState : null; },
    setItem() { throw new Error('Quota exceeded'); },
    removeItem() {}
  };

  const api = createDemoApi();
  const created = await api.post('/projects', { name: 'Volatile project', runtime: 'python' });
  assert.equal(created.status, 201);

  const reloaded = await api.get('/projects');
  assert.ok(reloaded.data.projects.some(project => project.name === 'Stored project'));
  assert.ok(reloaded.data.projects.some(project => project.name === 'Volatile project'));
});
