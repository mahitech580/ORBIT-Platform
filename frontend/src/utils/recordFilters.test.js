import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterInstances, filterTeams } from './recordFilters.js';

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
