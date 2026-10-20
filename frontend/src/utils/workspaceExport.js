const SENSITIVE_FIELD = /(?:password|secret|token|authorization|api[_-]?key|private[_-]?key|cookie|credential)/i;

// Browser restore is intended for workspace snapshots, not unbounded bulk imports.
const MAX_BACKUP_RECORDS = 10000;

const SENSITIVE_TEXT_PATTERNS = [
  [/\b[A-Z0-9_-]*(?:password|passwd|secret|token|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)\b\s*[:=]\s*["']?[^\s,;"']+/gi, '[REDACTED: credential assignment]'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|$)/g, '[REDACTED: private-key block]'],
  [/Bearer\s+[A-Za-z0-9._~+\/-]{16,}={0,2}/gi, '[REDACTED: bearer token]'],
  [/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/g, '[REDACTED: GitHub token]'],
  [/AKIA[0-9A-Z]{16}/g, '[REDACTED: AWS access key]'],
  [/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED: Google API key]'],
  [/xox[baprs]-[A-Za-z0-9-]{20,}/g, '[REDACTED: Slack token]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED: JWT]'],
  [/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED: provider key]']
];;

function redactSensitiveText(value) {
  if (typeof value === 'string') {
    return SENSITIVE_TEXT_PATTERNS.reduce(
      (safe, [pattern, replacement]) => safe.replace(pattern, replacement),
      value
    );
  }
  if (Array.isArray(value)) return value.map(redactSensitiveText);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactSensitiveText(item)])
  );
}

function redactSensitiveFields(value) {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== 'object') return redactSensitiveText(value);

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

  const safeRecords = redactSensitiveText(redactSensitiveFields(records));
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

  if (!snapshot.counts || typeof snapshot.counts !== 'object' || Array.isArray(snapshot.counts)) {
    errors.push('The backup count summary is missing or invalid.');
  } else if (collectionNames.some(name => !Object.prototype.hasOwnProperty.call(snapshot.counts, name))) {
    errors.push('The backup count summary is incomplete.');
  }

  const totalRecords = collectionNames.reduce((sum, name) => sum + (counts[name] || 0), 0);
  if (totalRecords > MAX_BACKUP_RECORDS) {
    errors.push('The backup exceeds the maximum of ' + MAX_BACKUP_RECORDS + ' records.');
    return { valid: false, errors, counts };
  }

  const projects = Array.isArray(snapshot.records.projects) ? snapshot.records.projects : [];
  const teams = Array.isArray(snapshot.records.teams) ? snapshot.records.teams : [];
  const deployments = Array.isArray(snapshot.records.deployments) ? snapshot.records.deployments : [];
  const instances = Array.isArray(snapshot.records.instances) ? snapshot.records.instances : [];
  const supportedRuntimes = new Set(['node', 'python', 'java', 'go']);
  projects.forEach((project, index) => {
    if (!project || typeof project !== 'object' || Array.isArray(project)) return;
    if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 120) {
      errors.push('Project record ' + (index + 1) + ' has an invalid name.');
    }
    if (project.description != null && (typeof project.description !== 'string' || project.description.length > 2000)) {
      errors.push('Project record ' + (index + 1) + ' has an invalid description.');
    }
    if (project.runtime != null && !supportedRuntimes.has(String(project.runtime).toLowerCase())) {
      errors.push('Project record ' + (index + 1) + ' uses an unsupported runtime.');
    }
    if (project.status != null && !['active', 'archived'].includes(String(project.status).toLowerCase())) {
      errors.push('Project record ' + (index + 1) + ' has an unsupported status.');
    }
  });
  teams.forEach((team, index) => {
    if (!team || typeof team !== 'object' || Array.isArray(team)) return;
    if (typeof team.name !== 'string' || !team.name.trim() || team.name.length > 120) {
      errors.push('Team record ' + (index + 1) + ' has an invalid name.');
    }
  });
  deployments.forEach((deployment, index) => {
    if (!deployment || typeof deployment !== 'object' || Array.isArray(deployment)) return;
    if (!Number.isFinite(Number(deployment.project_id))) {
      errors.push('Deployment record ' + (index + 1) + ' has an invalid project reference.');
    }
    if (deployment.version != null && (typeof deployment.version !== 'string' || deployment.version.length > 80)) {
      errors.push('Deployment record ' + (index + 1) + ' has an invalid version.');
    }
    if (deployment.branch != null && (typeof deployment.branch !== 'string' || deployment.branch.length > 200)) {
      errors.push('Deployment record ' + (index + 1) + ' has an invalid branch.');
    }
  });
  instances.forEach((instance, index) => {
    if (!instance || typeof instance !== 'object' || Array.isArray(instance)) return;
    if (!Number.isFinite(Number(instance.project_id))) {
      errors.push('Instance record ' + (index + 1) + ' has an invalid project reference.');
    }
    if (typeof instance.name !== 'string' || !instance.name.trim() || instance.name.length > 120) {
      errors.push('Instance record ' + (index + 1) + ' has an invalid name.');
    }
  });

  const validateIds = (items, label) => {
    const seen = new Set();
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      const id = Number(item.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        errors.push(label + ' record ' + (index + 1) + ' has an invalid ID.');
      } else if (seen.has(id)) {
        errors.push(label + ' records contain duplicate ID ' + id + '.');
      } else {
        seen.add(id);
      }
    });
    return seen;
  };
  const projectIds = validateIds(projects, 'Project');
  const teamIds = validateIds(teams, 'Team');
  projects.forEach((project, index) => {
    if (!project || typeof project !== 'object' || Array.isArray(project) || project.team_id == null) return;
    if (!teamIds.has(Number(project.team_id))) {
      errors.push('Project record ' + (index + 1) + ' references a team missing from the backup.');
    }
  });
  const deploymentIds = validateIds(deployments, 'Deployment');
  validateIds(instances, 'Instance');
  deployments.forEach((deployment, index) => {
    if (deployment && typeof deployment === 'object' && !Array.isArray(deployment) && !projectIds.has(Number(deployment.project_id))) {
      errors.push('Deployment record ' + (index + 1) + ' references a project missing from the backup.');
    }
  });
  instances.forEach((instance, index) => {
    if (!instance || typeof instance !== 'object' || Array.isArray(instance)) return;
    if (!projectIds.has(Number(instance.project_id))) errors.push('Instance record ' + (index + 1) + ' references a project missing from the backup.');
    if (instance.deployment_id != null && !deploymentIds.has(Number(instance.deployment_id))) {
      errors.push('Instance record ' + (index + 1) + ' references a deployment missing from the backup.');
    }
  });
  return { valid: errors.length === 0, errors, counts };
}
