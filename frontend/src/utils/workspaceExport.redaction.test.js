import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkspaceExport } from './workspaceExport.js';

test('redacts the complete value of quoted credential assignments', () => {
  const description = 'DATABASE_PASSWORD="two words are still secret"; API_TOKEN = \'another phrase stays private\'';
  const backup = buildWorkspaceExport({
    projects: [{ id: 1, name: 'Connector', description }]
  }, 'fixed-time');
  const exported = JSON.stringify(backup);

  assert.equal(exported.includes('two words are still secret'), false);
  assert.equal(exported.includes('another phrase stays private'), false);
  assert.equal((backup.records.projects[0].description.match(/REDACTED: credential assignment/g) || []).length, 2);
});


test('redacts bearer values in authorization assignments and passphrase fields', () => {
  const bearer = 'Bearer ' + 'long-token-value-12345678901234567890';
  const backup = buildWorkspaceExport({
    projects: [{
      id: 1,
      name: 'Service connection',
      description: 'AUTHORIZATION: ' + bearer + '; PASSPHRASE="words that must not escape"',
      passphrase: 'field-secret'
    }]
  }, 'fixed-time');
  const exported = JSON.stringify(backup);
  assert.equal(exported.includes('long-token-value-12345678901234567890'), false);
  assert.equal(exported.includes('words that must not escape'), false);
  assert.equal(exported.includes('field-secret'), false);
});


test('redacts Basic authorization assignments without keeping encoded credentials', () => {
  const encoded = 'dXNlcjpwYXNzd29yZC0xMjM0NTY=';
  const backup = buildWorkspaceExport({
    projects: [{ id: 1, name: 'Legacy connector', description: 'AUTHORIZATION: Basic ' + encoded }]
  }, 'fixed-time');
  assert.equal(JSON.stringify(backup).includes(encoded), false);
  assert.match(backup.records.projects[0].description, /REDACTED: credential assignment/);
});
