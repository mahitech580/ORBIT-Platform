import { serializeCsv } from './csv.js';

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
  return serializeCsv(header, rows);
}
