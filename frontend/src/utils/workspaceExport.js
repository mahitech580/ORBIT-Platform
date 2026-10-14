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
