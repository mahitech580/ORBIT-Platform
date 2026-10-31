/** Format untrusted telemetry timestamps without leaking "Invalid Date" into the UI. */
export function formatTelemetryTimestamp(value, options = {}, style = 'dateTime') {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return style === 'time'
    ? date.toLocaleTimeString(undefined, options)
    : date.toLocaleString(undefined, options);
}
