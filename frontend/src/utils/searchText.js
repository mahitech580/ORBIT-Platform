/**
 * Normalize user-facing search text consistently across workspace surfaces.
 * NFKD makes compatibility characters searchable while removing combining marks
 * keeps common accented names discoverable from an unaccented query.
 */
export function normalizeSearchText(value) {
  const text = String(value ?? '');
  return text
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/gu, ' ');
}

export function matchesSearch(values, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  const candidates = Array.isArray(values) ? values : [values];
  return candidates.some(value => normalizeSearchText(value).includes(needle));
}
