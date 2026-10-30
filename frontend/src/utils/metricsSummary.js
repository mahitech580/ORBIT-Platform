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

/** Summarize only values that satisfy the API's telemetry field domains. */
export function summarizeMetrics(metrics) {
  const records = Array.isArray(metrics)
    ? metrics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const requestValues = records
    .map(item => finiteMeasurement(item.requests_total))
    .filter(value => value !== null && Number.isSafeInteger(value) && value >= 0 && value <= POSTGRES_INTEGER_MAX);
  return {
    avg_cpu: averageOf(records, 'cpu_usage', value => value >= 0 && value <= 100),
    avg_memory: averageOf(records, 'memory_usage', value => Number.isSafeInteger(value) && value >= 0 && value <= POSTGRES_INTEGER_MAX),
    total_requests: requestValues.length ? requestValues.reduce((sum, value) => sum + value, 0) : null
  };
}
