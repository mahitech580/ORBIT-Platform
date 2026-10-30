function averageOf(records, key) {
  const values = records
    .map(record => record[key])
    .filter(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)))
    .map(Number);
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
}

/** Summarize the measurement rows currently displayed by the Metrics view. */
export function summarizeMetrics(metrics) {
  const records = Array.isArray(metrics)
    ? metrics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  return {
    avg_cpu: averageOf(records, 'cpu_usage'),
    avg_memory: averageOf(records, 'memory_usage'),
    total_requests: (() => {
      const values = records
        .map(item => item.requests_total)
        .filter(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)))
        .map(Number);
      return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
    })()
  };
}
