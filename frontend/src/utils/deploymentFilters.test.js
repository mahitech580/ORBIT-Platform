import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterDeployments } from './deploymentFilters.js';

const projects = [
  { id: 1, name: 'Payments API' },
  { id: 2, name: 'Frontend Console' }
];
const deployments = [
  { id: 10, project_id: 1, version: '2.1.0', branch: 'release/payments', status: 'completed' },
  { id: 11, project_id: 2, project_name: 'Frontend Console', version: '1.4.2', branch: 'main', status: 'in-progress' },
  { id: 12, project_id: 1, version: '2.0.9', branch: 'hotfix/timeout', status: 'failed' }
];

test('search matches project, version, branch, deployment id, and status case-insensitively', () => {
  assert.deepEqual(filterDeployments(deployments, { query: 'PAYMENTS', projects }).map(item => item.id), [10]);
  assert.deepEqual(filterDeployments(deployments, { query: '1.4.2', projects }).map(item => item.id), [11]);
  assert.deepEqual(filterDeployments(deployments, { query: 'hotfix', projects }).map(item => item.id), [12]);
  assert.deepEqual(filterDeployments(deployments, { query: 'IN-PROGRESS', projects }).map(item => item.id), [11]);
  assert.deepEqual(filterDeployments(deployments, { query: '10', projects }).map(item => item.id), [10]);
});

test('combines status and project filters and normalizes numeric/string ids', () => {
  assert.deepEqual(filterDeployments(deployments, {
    status: 'completed', projectId: '1', projects
  }).map(item => item.id), [10]);
  assert.deepEqual(filterDeployments(deployments, {
    status: 'failed', projectId: 2, projects
  }), []);
  assert.deepEqual(filterDeployments(deployments, {
    projectId: 'all', status: 'all', projects
  }).map(item => item.id), [10, 11, 12]);
});

test('trims search input, handles missing arrays, and ignores malformed records', () => {
  assert.deepEqual(filterDeployments([...deployments, null, 3, []], {
    query: '  MAIN ', projects
  }).map(item => item.id), [11]);
  assert.deepEqual(filterDeployments(null, { query: 'x' }), []);
  assert.deepEqual(filterDeployments([null, 'bad', []]), []);
});

test('filtering preserves original order and does not mutate source arrays', () => {
  const source = [...deployments];
  const result = filterDeployments(source, { status: 'failed', projects });
  assert.deepEqual(result.map(item => item.id), [12]);
  assert.deepEqual(source, deployments);
  assert.equal(result[0], deployments[2]);
});
