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


function csvCell(value) {
  let text = value == null
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

  // CSV quoting alone does not prevent spreadsheet formula evaluation.
  if (typeof value === 'string' && /^[\x00-\x20]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  return '"' + text.replaceAll('"', '""') + '"';
}

const METRIC_COLUMNS = [
  ['project_name', 'project_name'],
  ['timestamp', 'timestamp'],
  ['cpu_usage', 'cpu_usage'],
  ['memory_usage', 'memory_usage'],
  ['requests_total', 'requests_total'],
  ['errors_total', 'errors_total'],
  ['response_time_ms', 'response_time_ms']
];

/** Serialize the selected project's recorded telemetry with a stable CSV schema. */
export function serializeMetricsCsv(metrics, projectName) {
  const rows = Array.isArray(metrics)
    ? metrics.filter(metric => metric && typeof metric === 'object' && !Array.isArray(metric))
    : [];
  const header = METRIC_COLUMNS.map(([, label]) => csvCell(label)).join(',');
  const body = rows.map(metric => METRIC_COLUMNS.map(([key]) => (
    csvCell(key === 'project_name' ? projectName : metric[key])
  )).join(','));
  return [header, ...body].join('\r\n') + '\r\n';
}
