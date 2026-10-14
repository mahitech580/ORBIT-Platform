import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterInstances, filterTeams, sortInstances, sortTeams } from './recordFilters.js';

test('filters teams by case-insensitive name and description', () => {
  const teams = [
    { id: 1, name: 'Platform', description: 'Runtime services' },
    { id: 2, name: 'Design', description: 'Experience work' }
  ];
  assert.deepEqual(filterTeams(teams, 'PLATFORM').map(team => team.id), [1]);
  assert.deepEqual(filterTeams(teams, 'experience').map(team => team.id), [2]);
});

test('filters teams by owner metadata and ID', () => {
  const teams = [
    { id: 17, name: 'Core', owner_id: 42, owner_name: 'Mahi' },
    { id: 18, name: 'Web', owner_id: 43, owner_name: 'Another User' }
  ];
  assert.deepEqual(filterTeams(teams, 'mahi').map(team => team.id), [17]);
  assert.deepEqual(filterTeams(teams, '42').map(team => team.id), [17]);
});

test('blank search preserves original order and invalid values are ignored', () => {
  const teams = [{ id: 3, name: 'C' }, null, { id: 1, name: 'A' }];
  assert.deepEqual(filterTeams(teams, '  ').map(team => team.id), [3, 1]);
  assert.deepEqual(filterTeams(null, 'anything'), []);
});

test('filters instances using project names from the workspace when not denormalized', () => {
  const instances = [
    { id: 1, name: 'worker-east', project_id: 9, instance_type: 'small', status: 'running' },
    { id: 2, name: 'cache-west', project_id: 10, instance_type: 'medium', status: 'stopped' }
  ];
  const projects = [{ id: 9, name: 'Payments API' }, { id: 10, name: 'Catalog' }];
  assert.deepEqual(filterInstances(instances, projects, 'payments').map(item => item.id), [1]);
  assert.deepEqual(filterInstances(instances, projects, 'STOPPED').map(item => item.id), [2]);
});

test('filters instances by type, status and deployment metadata', () => {
  const instances = [
    { id: 1, name: 'worker', project_id: 5, instance_type: 't3.small', status: 'running', deployment_id: 88 },
    { id: 2, name: 'worker', project_id: 5, instance_type: 't3.large', status: 'stopped', deployment_id: 89 }
  ];
  assert.deepEqual(filterInstances(instances, [], 't3.large').map(item => item.id), [2]);
  assert.deepEqual(filterInstances(instances, [], '89').map(item => item.id), [2]);
});

test('search does not mutate source arrays or their ordering', () => {
  const teams = [{ id: 2, name: 'Beta' }, { id: 1, name: 'Alpha' }];
  const before = JSON.stringify(teams);
  assert.deepEqual(filterTeams(teams, 'alpha').map(team => team.id), [1]);
  assert.equal(JSON.stringify(teams), before);
});


test('sorts teams by name in both directions with deterministic ID tie breaks', () => {
  const source = [{ id: 9, name: 'alpha' }, { id: 2, name: 'Beta' }, { id: 1, name: 'ALPHA' }];
  assert.deepEqual(sortTeams(source, 'name-asc').map(item => item.id), [1, 9, 2]);
  assert.deepEqual(sortTeams(source, 'name-desc').map(item => item.id), [2, 1, 9]);
  assert.deepEqual(source.map(item => item.id), [9, 2, 1]);
});

test('sorts instances by age status and name without mutating source', () => {
  const source = [
    { id: 1, name: 'Zulu', status: 'stopped', created_at: '2026-10-01T00:00:00Z' },
    { id: 2, name: 'alpha', status: 'running', created_at: '2026-10-12T00:00:00Z' },
    { id: 3, name: 'Beta', status: 'running', created_at: 'bad-date' }
  ];
  const before = JSON.stringify(source);
  assert.deepEqual(sortInstances(source, 'newest').map(item => item.id), [2, 1, 3]);
  assert.deepEqual(sortInstances(source, 'oldest').map(item => item.id), [3, 1, 2]);
  assert.deepEqual(sortInstances(source, 'status').map(item => item.id), [2, 3, 1]);
  assert.deepEqual(sortInstances(source, 'name-asc').map(item => item.id), [2, 3, 1]);
  assert.equal(JSON.stringify(source), before);
});

test('falls back to a documented default for unknown sort modes', () => {
  assert.deepEqual(sortTeams([{ id: 2, name: 'B' }, { id: 1, name: 'A' }], 'random').map(item => item.id), [1, 2]);
  assert.deepEqual(sortInstances([{ id: 1, name: 'old', created_at: '2026-01-01' }, { id: 2, name: 'new', created_at: '2026-10-01' }], 'random').map(item => item.id), [2, 1]);
});
