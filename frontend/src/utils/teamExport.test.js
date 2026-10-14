import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTeamCsv } from './teamExport.js';

test('exports team IDs labels ownership and timestamps', () => {
  const csv = buildTeamCsv([{
    id: 2, name: 'Platform', description: 'API team', owner_id: 7,
    owner_name: 'Mahi', created_at: '2026-10-01', updated_at: '2026-10-02'
  }]);
  assert.ok(csv.startsWith('\uFEFFTeam ID,Name,Description,Owner ID,Owner,Created At,Updated At\r\n'));
  assert.ok(csv.includes('2,Platform,API team,7,Mahi,2026-10-01,2026-10-02\r\n'));
});

test('escapes team descriptions containing CSV separators', () => {
  const csv = buildTeamCsv([{ id: 1, name: 'API', description: 'tools, services and "support"' }]);
  assert.ok(csv.includes('"tools, services and ""support"""'));
});

test('neutralizes formula-like team names and preserves ordinary text', () => {
  const csv = buildTeamCsv([{ id: 1, name: '=HYPERLINK("x")' }, { id: 2, name: 'Frontend' }]);
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes(',Frontend,'));
});

test('handles empty or malformed team collections', () => {
  assert.equal(buildTeamCsv(null).split('\r\n').length, 2);
  assert.equal(buildTeamCsv([null, 'bad', []]).includes('bad'), false);
});
