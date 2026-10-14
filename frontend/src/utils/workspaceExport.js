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


/**
 * Validate an imported snapshot before any restore code touches browser storage.
 * This deliberately rejects unknown schema versions rather than guessing.
 */
export function validateWorkspaceBackup(snapshot) {
  const errors = [];
  const collectionNames = ['projects', 'deployments', 'teams', 'instances'];

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return { valid: false, errors: ['The backup must be a JSON object.'], counts: null };
  }
  if (snapshot.format !== 'ORBIT_WORKSPACE_BACKUP') errors.push('This file is not an ORBIT workspace backup.');
  if (snapshot.schema_version !== 1) errors.push('Unsupported backup schema version.');
  if (!snapshot.records || typeof snapshot.records !== 'object' || Array.isArray(snapshot.records)) {
    errors.push('The backup is missing its records object.');
    return { valid: false, errors, counts: null };
  }

  const counts = {};
  for (const name of collectionNames) {
    const collection = snapshot.records[name];
    if (!Array.isArray(collection)) {
      errors.push('The "' + name + '" collection must be an array.');
      counts[name] = 0;
      continue;
    }
    counts[name] = collection.length;
    if (collection.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
      errors.push('The "' + name + '" collection may contain only record objects.');
    }
    if (snapshot.counts && snapshot.counts[name] !== collection.length) {
      errors.push('The "' + name + '" count does not match the backup records.');
    }
  }

  if (snapshot.counts && collectionNames.some(name => !Object.prototype.hasOwnProperty.call(snapshot.counts, name))) {
    errors.push('The backup count summary is incomplete.');
  }
  return { valid: errors.length === 0, errors, counts };
}
