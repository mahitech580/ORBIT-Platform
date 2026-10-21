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
  const needle = String(query ?? '').trim().toLowerCase();

  return records.filter(deployment => {
    if (!deployment || typeof deployment !== 'object' || Array.isArray(deployment)) return false;

    const matchesStatus = status === 'all' || deployment.status === status;
    if (!matchesStatus) return false;

    const matchesProject = projectId === 'all' || projectId === '' ||
      String(deployment.project_id ?? '') === String(projectId);
    if (!matchesProject) return false;

    if (!needle) return true;

    const project = projectRecords.find(item =>
      item && String(item.id) === String(deployment.project_id)
    );
    const searchable = [
      deployment.id,
      deployment.project_name || project?.name || 'Unknown project',
      deployment.version,
      deployment.branch,
      deployment.status
    ].map(value => String(value ?? '')).join(' ').toLowerCase();

    return searchable.includes(needle);
  });
}
