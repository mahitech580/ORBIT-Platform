import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequestSequence } from './requestSequence.js';

test('only the newest request remains current', () => {
  const requests = createRequestSequence();
  const first = requests.begin();
  const second = requests.begin();

  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
});

test('logout or unmount invalidation rejects pending responses', () => {
  const requests = createRequestSequence();
  const pending = requests.begin();

  requests.invalidate();

  assert.equal(requests.isCurrent(pending), false);
});

test('separate request sequences do not invalidate one another', () => {
  const workspace = createRequestSequence();
  const health = createRequestSequence();
  const workspaceId = workspace.begin();
  const healthId = health.begin();

  health.invalidate();

  assert.equal(workspace.isCurrent(workspaceId), true);
  assert.equal(health.isCurrent(healthId), false);
});
