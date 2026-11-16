import { normalizeSearchText } from './searchText.js';

/**
 * Pure deployment filtering shared by the UI and regression tests.
 * The result preserves source order because the API is responsible for recency ordering.
 */
export function filterDeployments(deployments, {
  query = '',
  status = 'all',
  projectId = 'all',
  projects = []
} = {}) {
  const records = Array.isArray(deployments) ? deployments : [];
  const projectRecords = Array.isArray(projects) ? projects : [];
  const projectNames = new Map();
  for (const project of projectRecords) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) continue;
    const id = String(project.id);
    // Preserve Array.find's first-match behavior if legacy input contains duplicate IDs.
    if (!projectNames.has(id)) projectNames.set(id, project.name);
  }
  const needle = normalizeSearchText(query);

  return records.filter(deployment => {
    if (!deployment || typeof deployment !== 'object' || Array.isArray(deployment)) return false;

    const matchesStatus = status === 'all' || deployment.status === status;
    if (!matchesStatus) return false;

    const matchesProject = projectId === 'all' || projectId === '' ||
      String(deployment.project_id ?? '') === String(projectId);
    if (!matchesProject) return false;

    if (!needle) return true;

    const projectName = projectNames.get(String(deployment.project_id));
    const searchable = [
      deployment.id,
      deployment.project_name || projectName || 'Unknown project',
      deployment.version,
      deployment.branch,
      deployment.status
    ].map(normalizeSearchText).join(' ');

    return searchable.includes(needle);
  });
}
