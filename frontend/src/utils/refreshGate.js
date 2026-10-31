/** Coalesce duplicate refresh signals and keep slow requests from overlapping. */
export function createRefreshGate(refresh, cooldownMs = 1000, now = Date.now) {
  if (typeof refresh !== 'function') throw new TypeError('A refresh callback is required.');
  const cooldown = Number.isFinite(cooldownMs) ? Math.max(0, cooldownMs) : 1000;
  let lastStartedAt = -Infinity;
  let inFlight = false;

  return (...args) => {
    const timestamp = now();
    if (inFlight || !Number.isFinite(timestamp) || timestamp - lastStartedAt < cooldown) return false;
    lastStartedAt = timestamp;
    const result = refresh(...args);
    if (result && typeof result.then === 'function') {
      inFlight = true;
      Promise.resolve(result).then(
        () => { inFlight = false; },
        () => { inFlight = false; }
      );
    }
    return true;
  };
}
