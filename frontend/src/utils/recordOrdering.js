function timestampOf(record, field) {
  const value = record?.[field];
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function idOf(record) {
  const id = Number(record?.id);
  return Number.isSafeInteger(id) ? id : null;
}

/** Match PostgreSQL's newest-first ordering, including a stable ID tie-breaker. */
export function compareNewestFirst(a, b, timestampField) {
  const aTimestamp = timestampOf(a, timestampField);
  const bTimestamp = timestampOf(b, timestampField);
  if (aTimestamp !== bTimestamp) {
    if (aTimestamp === null) return 1;
    if (bTimestamp === null) return -1;
    return bTimestamp - aTimestamp;
  }

  const aId = idOf(a);
  const bId = idOf(b);
  if (aId === null) return bId === null ? 0 : 1;
  if (bId === null) return -1;
  return bId - aId;
}
