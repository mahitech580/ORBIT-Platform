const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

function csvCell(value) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

export function buildTeamCsv(teams) {
  const records = Array.isArray(teams)
    ? teams.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const header = ['Team ID', 'Name', 'Description', 'Owner ID', 'Owner', 'Created At', 'Updated At'];
  const rows = records.map(team => [
    team.id, team.name, team.description, team.owner_id, team.owner_name, team.created_at, team.updated_at
  ]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
