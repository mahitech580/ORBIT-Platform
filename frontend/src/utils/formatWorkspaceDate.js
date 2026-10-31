/** Render workspace dates safely when imported or legacy records contain invalid values. */
export function formatWorkspaceDate(value, { dateOnly = false } = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString();
}
