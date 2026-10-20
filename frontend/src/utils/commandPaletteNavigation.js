/**
 * Return the next valid active option index for the command palette.
 * Empty lists and unknown directions safely resolve to index zero.
 */
export function nextCommandIndex(currentIndex, direction, resultCount) {
  if (!Number.isInteger(resultCount) || resultCount <= 0) return 0;
  const lastIndex = resultCount - 1;
  const current = Number.isInteger(currentIndex)
    ? Math.max(0, Math.min(currentIndex, lastIndex))
    : 0;
  if (direction === 'down') return Math.min(current + 1, lastIndex);
  if (direction === 'up') return Math.max(current - 1, 0);
  return current;
}
