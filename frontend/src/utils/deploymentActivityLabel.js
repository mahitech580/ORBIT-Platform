function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** Provide a meaningful text alternative for the dashboard's visual activity chart. */
export function describeDeploymentActivity(weekly) {
  if (!Array.isArray(weekly) || weekly.length === 0) {
    return 'No deployment activity has been recorded in the last seven days.';
  }

  const days = weekly.map(item => {
    const day = typeof item?.day === 'string' && item.day.trim() ? item.day.trim() : 'Day';
    const date = item?.date instanceof Date && Number.isFinite(item.date.getTime())
      ? ' ' + item.date.getDate()
      : '';
    const completed = safeCount(item?.completed);
    const failed = safeCount(item?.failed);
    const pending = safeCount(item?.pending);
    const classified = completed + failed + pending;
    const total = Math.max(safeCount(item?.total), classified);
    const other = total - classified;
    const remainder = other ? ', ' + other + ' other' : '';
    return day + date + ': ' + total + ' total, ' + completed + ' completed, ' +
      failed + ' failed, ' + pending + ' pending' + remainder;
  });

  return 'Daily deployment records over the last seven days. ' + days.join('; ') + '.';
}
