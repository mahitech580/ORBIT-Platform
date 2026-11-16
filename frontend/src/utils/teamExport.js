import { serializeCsv } from './csv.js';

export function buildTeamCsv(teams, projects = []) {
  const records = Array.isArray(teams)
    ? teams.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const projectCounts = new Map();
  (Array.isArray(projects) ? projects : []).forEach(project => {
    if (!project || typeof project !== 'object' || project.team_id == null) return;
    const key = String(project.team_id);
    projectCounts.set(key, (projectCounts.get(key) || 0) + 1);
  });
  const header = ['Team ID', 'Name', 'Description', 'Owner ID', 'Owner', 'Project Count', 'Created At', 'Updated At'];
  const rows = records.map(team => {
    const declaredCount = Number(team.project_count);
    const projectCount = Number.isSafeInteger(declaredCount) && declaredCount >= 0
      ? declaredCount
      : projectCounts.get(String(team.id)) || 0;
    return [
      team.id, team.name, team.description, team.owner_id, team.owner_name,
      projectCount, team.created_at, team.updated_at
    ];
  });
  return serializeCsv(header, rows);
}
