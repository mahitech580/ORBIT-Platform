import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDemoApi } from './demoApi.js';

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

  const api = createDemoApi();
  const teams = (await api.get('/teams')).data.teams;
  assert.equal(teams.length, 1);
  assert.equal(teams[0].project_count, 3);
});
