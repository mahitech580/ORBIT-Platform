import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createDemoApi } from './demoApi.js';

afterEach(() => {
  delete globalThis.localStorage;
});

test('keeps a registered demo account isolated when browser storage is blocked', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('Storage access denied'); },
    setItem() { throw new Error('Storage access denied'); },
    removeItem() { throw new Error('Storage access denied'); }
  };

  const api = createDemoApi();
  const registered = await api.post('/auth/register', {
    email: 'volatile-owner@example.com',
    username: 'volatile_owner',
    password: 'volatile-account-password-123',
    first_name: 'Volatile'
  });

  assert.equal(registered.data.user.id, 2);
  assert.deepEqual((await api.get('/projects')).data.projects, []);

  const created = await api.post('/projects', {
    name: 'Private volatile project',
    runtime: 'python'
  });
  assert.equal(created.data.project.owner_id, registered.data.user.id);
  assert.deepEqual(
    (await api.get('/projects')).data.projects.map(project => project.name),
    ['Private volatile project']
  );
});
