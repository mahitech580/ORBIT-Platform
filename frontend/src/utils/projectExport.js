const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

function csvCell(value) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/** Serialize the exact project list displayed by the current filters. */
export function buildProjectCsv(projects) {
  const records = Array.isArray(projects)
    ? projects.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const header = ['Project ID', 'Name', 'Description', 'Runtime', 'Status', 'Team', 'Created At', 'Updated At'];
  const rows = records.map(project => [
    project.id,
    project.name,
    project.description,
    project.runtime,
    project.status,
    project.team_name,
    project.created_at,
    project.updated_at
  ]);
  return '\uFEFF' + [header, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';
}
