import { serializeCsv } from './csv.js';

export function buildTeamCsv(teams) {
  const records = Array.isArray(teams)
    ? teams.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const header = ['Team ID', 'Name', 'Description', 'Owner ID', 'Owner', 'Created At', 'Updated At'];
  const rows = records.map(team => [
    team.id, team.name, team.description, team.owner_id, team.owner_name, team.created_at, team.updated_at
  ]);
  return serializeCsv(header, rows);
}
