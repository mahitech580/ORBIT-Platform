import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCurrentBearerRequest } from './currentAuthRequest.js';

test('accepts a 401 response from the currently stored bearer token', () => {
  assert.equal(isCurrentBearerRequest({ Authorization: 'Bearer current-token' }, 'current-token'), true);
});

test('ignores a late 401 response from a token that has already been replaced', () => {
  assert.equal(isCurrentBearerRequest({ Authorization: 'Bearer old-token' }, 'new-token'), false);
});

test('supports AxiosHeaders-style case-insensitive accessors', () => {
  const headers = { get: name => name.toLowerCase() === 'authorization' ? 'Bearer active-token' : null };
  assert.equal(isCurrentBearerRequest(headers, 'active-token'), true);
});

test('supports lower-case plain-object header names', () => {
  assert.equal(isCurrentBearerRequest({ authorization: 'Bearer active-token' }, 'active-token'), true);
});

test('does not log out when the request or current token has no bearer value', () => {
  assert.equal(isCurrentBearerRequest({}, 'active-token'), false);
  assert.equal(isCurrentBearerRequest({ Authorization: 'Bearer active-token' }, null), false);
});
