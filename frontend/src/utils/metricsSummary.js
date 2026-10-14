function averageOf(records, key) {
  const values = records
    .map(record => record[key])
    .filter(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)))
    .map(Number);
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0;
}

/** Summarize the measurement rows currently displayed by the Metrics view. */
export function summarizeMetrics(metrics) {
  const records = Array.isArray(metrics)
    ? metrics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  return {
    avg_cpu: averageOf(records, 'cpu_usage'),
    avg_memory: averageOf(records, 'memory_usage'),
    total_requests: records.reduce((sum, item) => {
      const count = item.requests_total;
      return count !== null && count !== undefined && count !== '' && Number.isFinite(Number(count))
        ? sum + Number(count)
        : sum;
    }, 0)
  };
}
