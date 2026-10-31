import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveDeploymentProjectId } from './deploymentProjectSelection.js';

const projects = [{ id: 7, name: 'API' }, { id: 12, name: 'Frontend' }];

test('selects the first project when async data arrives or prior selection is missing', () => {
  assert.equal(resolveDeploymentProjectId('', projects), 7);
  assert.equal(resolveDeploymentProjectId(99, projects), 7);
});

test('preserves an available selection across project refreshes', () => {
  assert.equal(resolveDeploymentProjectId('12', projects), 12);
});

test('returns an empty selection when no projects are available', () => {
  assert.equal(resolveDeploymentProjectId(7, []), '');
  assert.equal(resolveDeploymentProjectId(7, null), '');
});

 
test('excludes archived projects and falls back to the first active project', () => {
  const choices = [
    { id: 7, name: 'Archived API', status: 'archived' },
    { id: 12, name: 'Active frontend', status: 'active' }
  ];
  assert.equal(resolveDeploymentProjectId(7, choices), 12);
  assert.equal(resolveDeploymentProjectId('', choices), 12);
});

test('returns no deployment selection when every project is archived', () => {
  assert.equal(resolveDeploymentProjectId(7, [{ id: 7, status: 'archived' }]), '');
});

test('keeps legacy projects without a status field deployable', () => {
  assert.equal(resolveDeploymentProjectId('', [{ id: 9, name: 'Legacy project' }]), 9);
});
