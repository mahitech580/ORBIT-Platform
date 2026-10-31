/** Coalesce focus, visibility, and timer refreshes that fire in the same moment. */
export function createRefreshGate(refresh, cooldownMs = 1000, now = Date.now) {
  if (typeof refresh !== 'function') throw new TypeError('A refresh callback is required.');
  const cooldown = Number.isFinite(cooldownMs) ? Math.max(0, cooldownMs) : 1000;
  let lastStartedAt = -Infinity;

  return (...args) => {
    const timestamp = now();
    if (!Number.isFinite(timestamp) || timestamp - lastStartedAt < cooldown) return false;
    lastStartedAt = timestamp;
    refresh(...args);
    return true;
  };
}
