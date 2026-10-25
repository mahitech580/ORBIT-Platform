import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getApiErrorMessage } from './apiError.js';

const REQUEST_ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('formats a readable server error with its valid request reference', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: 'Not found' }, headers: { 'x-request-id': REQUEST_ID } } }, 'Fallback'),
    'Not found (Reference: ' + REQUEST_ID + ')'
  );
});

test('supports the Headers get accessor used by some HTTP clients', () => {
  const headers = { get: name => name === 'x-request-id' ? REQUEST_ID : null };
  assert.equal(
    getApiErrorMessage({ response: { data: {}, headers } }, 'Please retry'),
    'Please retry (Reference: ' + REQUEST_ID + ')'
  );
});

test('does not expose malformed or caller-controlled reference strings', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: 'Failure' }, headers: { 'x-request-id': 'caller-controlled' } } }),
    'Failure'
  );
});

test('uses a fallback for an empty API error message', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: '   ' } } }, 'Network unavailable'),
    'Network unavailable'
  );
});

test('handles absent response objects without throwing', () => {
  assert.equal(getApiErrorMessage(new Error('offline'), 'Try again'), 'Try again');
});

test('accepts the canonical uppercase request-ID header spelling', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: 'Rejected' }, headers: { 'X-Request-ID': REQUEST_ID } } }),
    'Rejected (Reference: ' + REQUEST_ID + ')'
  );
});

test('trims whitespace from server error messages', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: '  Invalid input  ' } } }),
    'Invalid input'
  );
});

test('uses fallback text for non-string server error payloads', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: { message: 'internal' } } } }, 'Request failed'),
    'Request failed'
  );
});

test('ignores request references containing line breaks', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: 'Failure' }, headers: { 'x-request-id': REQUEST_ID + '\\nforged' } } }),
    'Failure'
  );
});

test('keeps normal API messages unchanged when no request ID exists', () => {
  assert.equal(
    getApiErrorMessage({ response: { data: { error: 'Project not found.' }, headers: {} } }),
    'Project not found.'
  );
});

test('rejects request IDs with whitespace padding', () => {
  assert.equal(
    getApiErrorMessage({
      response: { data: { error: 'Failure' }, headers: { 'x-request-id': ' ' + REQUEST_ID } }
    }),
    'Failure'
  );
});
