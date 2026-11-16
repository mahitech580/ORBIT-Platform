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


test('redacts database and connection-string values embedded in operational text', () => {
  const databaseUrl = 'postgresql://orbit-user:database-password@db.example.test:5432/orbit';
  const backup = buildWorkspaceExport({
    projects: [{
      id: 1,
      name: 'Database connector',
      description: 'DATABASE_URL=' + databaseUrl + '; connection_string="mongodb+srv://user:pass@cluster.example.test/app"'
    }]
  }, 'fixed-time');
  const exported = JSON.stringify(backup);
  assert.equal(exported.includes('database-password'), false);
  assert.equal(exported.includes('mongodb+srv://user:pass@cluster.example.test'), false);
  assert.match(backup.records.projects[0].description, /REDACTED: credential assignment/);
});

test('redacts generic URL user-info but preserves ordinary documentation URLs', () => {
  const backup = buildWorkspaceExport({
    projects: [{
      id: 1,
      name: 'Webhook integration',
      description: 'Source https://docs.example.test/setup and endpoint https://operator:private-value@api.example.test/hooks'
    }]
  }, 'fixed-time');
  const description = backup.records.projects[0].description;
  assert.match(description, /https:\/\/docs\.example\.test\/setup/);
  assert.match(description, /https:\/\/\[REDACTED\]@api\.example\.test\/hooks/);
  assert.equal(description.includes('private-value'), false);
});

test('removes connection, database URL, webhook and access-key fields by name', () => {
  const backup = buildWorkspaceExport({
    projects: [{
      id: 1,
      name: 'Sensitive connector',
      database_url: 'postgresql://secret',
      connection_string: 'mongodb://secret',
      webhook_url: 'https://hooks.example.test/private',
      aws_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
      public_documentation_url: 'https://docs.example.test'
    }]
  }, 'fixed-time');
  const record = backup.records.projects[0];
  assert.equal(Object.hasOwn(record, 'database_url'), false);
  assert.equal(Object.hasOwn(record, 'connection_string'), false);
  assert.equal(Object.hasOwn(record, 'webhook_url'), false);
  assert.equal(Object.hasOwn(record, 'aws_access_key_id'), false);
  assert.equal(record.public_documentation_url, 'https://docs.example.test');
});
