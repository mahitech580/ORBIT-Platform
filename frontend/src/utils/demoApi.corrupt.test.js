import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDemoApi, demoStorageKey } from './demoApi.js';

afterEach(() => {
  delete globalThis.localStorage;
});

test('filters malformed records inside otherwise valid persisted collections', async () => {
  const storage = new Map();
  const saved = {
    nextProjectId: 12,
    nextDeploymentId: 6,
    nextTeamId: 2,
    nextInstanceId: 2,
    accounts: [null, 'bad', { id: 'bad', email: 'broken@example.com', username: 'broken', password_hash: 'hash' }, { id: 2, email: 'member@example.com', username: 'member', password_hash: 'hash' }],
    teams: [null, false, { id: 'bad', owner_id: 1, name: 'Broken Team' }, { id: 1, owner_id: 1, name: 'Demo Team', description: '' }],
    projects: [
      null,
      'bad',
      { id: 'bad', owner_id: 1, name: 'Broken project' },
      { id: true, owner_id: 1, name: 'Boolean ID' },
      { id: '1.0', owner_id: 1, name: 'Decimal ID' },
      { id: 12, owner_id: false, name: 'False owner must not become demo user' },
      { id: 13, owner_id: true, name: 'Boolean owner' },
      { id: 14, owner_id: '1.0', name: 'Decimal owner' },
      { id: 11, owner_id: 1, team_id: 1, team_name: 'Demo Team', name: 'Valid project', runtime: 'node', status: 'active' }
    ],
    deployments: [null, 3, { id: 'bad', project_id: 11, version: 'bad' }, { id: 5, project_id: 11, project_name: 'Valid project', version: '1.0.0', branch: 'main', status: 'completed' }],
    instances: [null, 'bad', { id: 'bad', project_id: 11, deployment_id: 5, name: 'broken' }, { id: 1, project_id: 11, deployment_id: 5, name: 'worker', instance_type: 'small', status: 'running' }],
    metrics: { 11: [null, 'bad', { id: 8, project_id: 11, cpu_usage: 20, memory_usage: 256, requests_total: 10, errors_total: 0, timestamp: '2026-10-21T10:00:00Z' }], 99: 'broken' }
  };
  storage.set(demoStorageKey, JSON.stringify(saved));
  globalThis.localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };

  const api = createDemoApi();
  assert.deepEqual((await api.get('/projects')).data.projects.map(item => item.name), ['Valid project']);
  assert.deepEqual((await api.get('/deployments')).data.deployments.map(item => item.id), [5]);
  assert.deepEqual((await api.get('/teams')).data.teams.map(item => item.id), [1]);
  assert.deepEqual((await api.get('/instances')).data.instances.map(item => item.id), [1]);
  assert.deepEqual((await api.get('/metrics/11')).data.metrics.map(item => item.id), [8]);
});
