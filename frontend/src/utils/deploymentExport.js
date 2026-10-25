import { serializeCsv } from './csv.js';

/**
 * Export deployment records exactly as currently shown by the supplied list.
 * Project labels are resolved from workspace records when the deployment does
 * not contain a denormalized project_name. The original arrays are not changed.
 */
export function buildDeploymentCsv(deployments, projects = []) {
  const records = Array.isArray(deployments)
    ? deployments.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const projectRecords = Array.isArray(projects) ? projects : [];
  const header = ['Deployment ID', 'Project', 'Version', 'Branch', 'Status', 'Created At', 'Completed At'];
  const rows = records.map(deployment => {
    const project = projectRecords.find(item =>
      item && String(item.id) === String(deployment.project_id)
    );
    return [
      deployment.id,
      deployment.project_name || project?.name || 'Unknown project',
      deployment.version,
      deployment.branch,
      deployment.status,
      deployment.created_at,
      deployment.completed_at
    ];
  });
  // BOM helps spreadsheet programs recognize UTF-8; CRLF is the conventional CSV row ending.
  return serializeCsv(header, rows);
}
