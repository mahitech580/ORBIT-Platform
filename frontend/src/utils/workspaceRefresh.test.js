import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectWorkspaceRefresh } from './workspaceRefresh.js';

const response = (key, records) => ({ status: 'fulfilled', value: { data: { [key]: records } } });

test('collects all resource collections from a complete workspace refresh', () => {
  const result = collectWorkspaceRefresh([
    response('projects', [{ id: 1 }]),
    response('deployments', [{ id: 2 }]),
    response('teams', [{ id: 3 }]),
    response('instances', [{ id: 4 }])
  ]);
  assert.deepEqual(result.updates, {
    projects: [{ id: 1 }],
    deployments: [{ id: 2 }],
    teams: [{ id: 3 }],
    instances: [{ id: 4 }]
  });
  assert.deepEqual(result.failures, []);
});

test('preserves successful resources when an unrelated endpoint rejects', () => {
  const error = new Error('Teams endpoint unavailable');
  const result = collectWorkspaceRefresh([
    response('projects', [{ id: 1 }]),
    { status: 'rejected', reason: error },
    response('teams', [{ id: 3 }]),
    response('instances', [])
  ]);
  assert.deepEqual(Object.keys(result.updates), ['projects', 'teams', 'instances']);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].resource, 'deployments');
  assert.equal(result.failures[0].error, error);
});

test('treats malformed fulfilled payloads as failures without clearing data', () => {
  const result = collectWorkspaceRefresh([
    { status: 'fulfilled', value: { data: { projects: 'not-a-list' } } },
    response('deployments', []),
    response('teams', []),
    response('instances', [])
  ]);
  assert.equal(Object.hasOwn(result.updates, 'projects'), false);
  assert.equal(result.failures[0].resource, 'projects');
  assert.match(result.failures[0].error.message, /valid collection/);
});

test('marks missing results as unavailable and tolerates a malformed argument', () => {
  const result = collectWorkspaceRefresh([]);
  assert.equal(result.updates && Object.keys(result.updates).length, 0);
  assert.deepEqual(result.failures.map(item => item.resource), [
    'projects', 'deployments', 'teams', 'instances'
  ]);
  assert.equal(collectWorkspaceRefresh(null).failures.length, 4);
});
