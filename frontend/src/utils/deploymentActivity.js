function localDateKey(date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
}

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Build the dashboard's seven local calendar-day buckets in one pass.
 * Unknown states remain visible as "other" instead of inflating the axis only.
 */
export function buildWeeklyDeploymentActivity(deployments, now = new Date()) {
  const current = parseDate(now);
  if (!current) return [];

  current.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() - (6 - index));
    return {
      key: localDateKey(date),
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date,
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      other: 0
    };
  });
  const buckets = new Map(days.map(day => [day.key, day]));

  for (const deployment of Array.isArray(deployments) ? deployments : []) {
    if (!deployment || typeof deployment !== 'object' || Array.isArray(deployment)) continue;
    const createdAt = parseDate(deployment.created_at);
    if (!createdAt) continue;
    const bucket = buckets.get(localDateKey(createdAt));
    if (!bucket) continue;

    bucket.total += 1;
    const status = String(deployment.status ?? '').trim().toLowerCase();
    if (status === 'completed') bucket.completed += 1;
    else if (status === 'failed') bucket.failed += 1;
    else if (status === 'pending' || status === 'in-progress') bucket.pending += 1;
    else bucket.other += 1;
  }

  return days;
}
