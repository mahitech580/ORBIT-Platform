import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requiredTextError } from './requiredText.js';

test('rejects whitespace-only and non-text required values', () => {
  assert.equal(requiredTextError('   ', 'Project name'), 'Project name is required.');
  assert.equal(requiredTextError(null, 'Team name'), 'Team name is required.');
  assert.equal(requiredTextError(42, 'Version'), 'Version is required.');
});

test('accepts text that contains meaningful non-space characters', () => {
  assert.equal(requiredTextError('  api-service  ', 'Project name'), '');
  assert.equal(requiredTextError('v2.1.0', 'Version'), '');
});

test('uses a neutral field label when one is not supplied', () => {
  assert.equal(requiredTextError(''), 'Value is required.');
});
