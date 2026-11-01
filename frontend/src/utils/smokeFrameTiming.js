const DEFAULT_SMOKE_FRAME_INTERVAL_MS = 1000 / 30;

/** Return the wait before the next 30fps frame without polling requestAnimationFrame. */
export function getSmokeFrameDelay(now, lastFrame, interval = DEFAULT_SMOKE_FRAME_INTERVAL_MS) {
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(lastFrame) ||
    lastFrame <= 0 ||
    !Number.isFinite(interval) ||
    interval <= 0
  ) return 0;
  const elapsed = now - lastFrame;
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.max(0, Math.ceil(interval - elapsed));
}
