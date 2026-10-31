/**
 * Keep the deployment form's project selection valid as async project data loads
 * or the selected project is removed.
 */
export function resolveDeploymentProjectId(currentId, projects) {
  const available = (Array.isArray(projects) ? projects : []).filter(project => project && project.status !== 'archived');
  const selected = available.find(project => String(project?.id) === String(currentId));
  return selected ? selected.id : (available[0]?.id ?? '');
}
