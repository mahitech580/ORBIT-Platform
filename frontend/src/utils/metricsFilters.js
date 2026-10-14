export const METRIC_TIME_RANGES = Object.freeze({
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
});

/** Filter returned telemetry by timestamp without mutating the source list. */
export function filterMetricsByRange(metrics, range = 'all', now = Date.now()) {
  const records = Array.isArray(metrics)
    ? metrics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  if (range === 'all') return records;
  const duration = METRIC_TIME_RANGES[range];
  if (!duration || !Number.isFinite(Number(now))) return [];
  const cutoff = Number(now) - duration;
  return records.filter(metric => {
    const timestamp = Date.parse(metric.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= Number(now);
  });
}
