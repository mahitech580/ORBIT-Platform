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
