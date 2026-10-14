export const METRIC_TIME_RANGES = Object.freeze({
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
});

/** Accept ISO strings, Date objects, Unix seconds, or Unix milliseconds. */
export function parseMetricTimestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : NaN;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1e11 ? value * 1000 : value;
    return Number.isFinite(new Date(milliseconds).getTime()) ? milliseconds : NaN;
  }
  if (typeof value !== 'string' || !value.trim()) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

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
    const timestamp = parseMetricTimestamp(metric.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= Number(now);
  });
}
