const COLLECTIONS = ['projects', 'deployments', 'teams', 'instances'];

/** Build a portable, versioned snapshot of workspace records without session credentials. */
export function createWorkspaceExport(workspace, exportedAt = new Date().toISOString()) {
  const source = workspace && typeof workspace === 'object' ? workspace : {};
  return {
    format: 'orbit-workspace-export',
    schemaVersion: 1,
    exportedAt,
    collections: Object.fromEntries(COLLECTIONS.map(name => [
      name,
      Array.isArray(source[name]) ? source[name] : []
    ]))
  };
}

export function serializeWorkspaceExport(workspace, exportedAt) {
  return JSON.stringify(createWorkspaceExport(workspace, exportedAt), null, 2) + '\n';
}

function csvCell(value) {
  let text = value == null
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

  // Prefix formula-like text so spreadsheet applications do not execute it.
  if (typeof value === 'string' && /^[\x00-\x20]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replaceAll('"', '""') + '"';
}

/** Export mixed workspace records as a single spreadsheet-friendly CSV. */
export function serializeWorkspaceCsv(workspace) {
  const source = workspace && typeof workspace === 'object' ? workspace : {};
  const records = COLLECTIONS.flatMap(type => (
    Array.isArray(source[type])
      ? source[type].filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .map(item => ({ ...item, record_type: type }))
      : []
  ));
  const columns = [...new Set(records.flatMap(record => Object.keys(record)))];
  const header = ['record_type', ...columns.filter(key => key !== 'record_type').sort()];
  const rows = records.map(record => header.map(key => csvCell(record[key])).join(','));
  return [header.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';
}
