const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

/** Escape a value for CSV and neutralize spreadsheet formula prefixes. */
function csvCell(value) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

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
  return '\uFEFF' + [header, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';
}
