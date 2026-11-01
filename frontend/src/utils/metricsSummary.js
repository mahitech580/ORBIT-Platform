const POSTGRES_INTEGER_MAX = 2147483647;

function finiteMeasurement(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function averageOf(records, key, isValid = () => true) {
  const values = records
    .map(record => finiteMeasurement(record[key]))
    .filter(value => value !== null && isValid(value));
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
}

function validIntegerMeasurement(value) {
  const number = finiteMeasurement(value);
  return number !== null && Number.isSafeInteger(number) && number >= 0 && number <= POSTGRES_INTEGER_MAX
    ? number
    : null;
}

/** Normalize legacy rows before either rendering or summarizing telemetry. */
export function sanitizeMetricRecords(metrics) {
  const records = Array.isArray(metrics)
    ? metrics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  return records.map(record => {
    const cpu = finiteMeasurement(record.cpu_usage);
    const requests = validIntegerMeasurement(record.requests_total);
    const errors = validIntegerMeasurement(record.errors_total);
    const memory = validIntegerMeasurement(record.memory_usage);
    const responseTime = finiteMeasurement(record.response_time_ms);
    return {
      ...record,
      cpu_usage: cpu !== null && cpu >= 0 && cpu <= 100 ? cpu : null,
      memory_usage: memory,
      requests_total: requests,
      errors_total: errors !== null && (requests === null || errors <= requests) ? errors : null,
      response_time_ms: responseTime !== null && responseTime >= 0 && responseTime <= 999999.99
        ? responseTime
        : null
    };
  });
}

/** Summarize only values that satisfy the API's telemetry field domains. */
export function summarizeMetrics(metrics) {
  const records = sanitizeMetricRecords(metrics);
  const requestValues = records.map(item => item.requests_total).filter(value => value !== null);
  return {
    avg_cpu: averageOf(records, 'cpu_usage'),
    avg_memory: averageOf(records, 'memory_usage'),
    total_requests: requestValues.length ? requestValues.reduce((sum, value) => sum + value, 0) : null
  };
}
