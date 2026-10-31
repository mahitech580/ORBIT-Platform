/** Render workspace dates safely without shifting date-only values across time zones. */
export function formatWorkspaceDate(value, { dateOnly = false } = {}) {
  if (value === null || value === undefined) return '—';
  const input = typeof value === 'string' ? value.trim() : value;
  if (input === '') return '—';

  let date;
  const dateOnlyMatch = typeof input === 'string'
    ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
    : null;
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return '—';
    }
  } else {
    date = input instanceof Date ? input : new Date(input);
  }

  if (!Number.isFinite(date.getTime())) return '—';
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString();
}
