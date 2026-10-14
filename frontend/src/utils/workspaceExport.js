const SENSITIVE_FIELD = /(?:password|secret|token|authorization|api[_-]?key|private[_-]?key|cookie|credential)/i;

function redactSensitiveFields(value) {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_FIELD.test(key))
      .map(([key, item]) => [key, redactSensitiveFields(item)])
  );
}

/**
 * Build a portable, versioned snapshot of workspace records.
 * Authentication state is intentionally not accepted as an input.
 */
export function buildWorkspaceExport({
  mode = 'server-api',
  projects = [],
  deployments = [],
  teams = [],
  instances = []
} = {}, exportedAt = new Date().toISOString()) {
  const records = {
    projects: Array.isArray(projects) ? projects : [],
    deployments: Array.isArray(deployments) ? deployments : [],
    teams: Array.isArray(teams) ? teams : [],
    instances: Array.isArray(instances) ? instances : []
  };

  const safeRecords = redactSensitiveFields(records);
  return {
    format: 'ORBIT_WORKSPACE_BACKUP',
    schema_version: 1,
    exported_at: exportedAt,
    mode: mode === 'browser-demo' ? 'browser-demo' : 'server-api',
    notice: 'Workspace records only. Credential-like fields are removed; this file may still contain operational information.',
    counts: Object.fromEntries(
      Object.entries(safeRecords).map(([key, value]) => [key, value.length])
    ),
    records: safeRecords
  };
}
