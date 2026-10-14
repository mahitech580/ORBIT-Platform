const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

function csvCell(value) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/** Export measurements exactly as returned for the selected project. */
export function buildMetricsCsv(metrics, project = {}) {
  const records = Array.isArray(metrics)
    ? metrics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const header = ['Project ID', 'Project', 'Timestamp', 'CPU Usage (%)', 'Memory (MB)', 'Requests Total', 'Errors Total', 'Response Time (ms)'];
  const rows = records.map(metric => [
    project.id,
    project.name,
    metric.timestamp,
    metric.cpu_usage,
    metric.memory_usage,
    metric.requests_total,
    metric.errors_total,
    metric.response_time_ms
  ]);
  return '\uFEFF' + [header, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';
}
