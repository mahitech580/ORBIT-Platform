const MAX_TILT_X = 6;
const MAX_TILT_Y = 4.5;

function clamp(value, minimum, maximum) {
  const bounded = Math.min(maximum, Math.max(minimum, value));
  return bounded === 0 ? 0 : bounded;
}

/** Convert a pointer position into a bounded, gentle 3D scene tilt. */
export function getOrbitTilt(clientX, clientY, bounds) {
  const left = Number(bounds?.left);
  const top = Number(bounds?.top);
  const width = Math.max(Number(bounds?.width), 1);
  const height = Math.max(Number(bounds?.height), 1);
  const x = Number(clientX);
  const y = Number(clientY);

  if (![left, top, width, height, x, y].every(Number.isFinite)) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp(((x - left) / width - 0.5) * MAX_TILT_X * 2, -MAX_TILT_X, MAX_TILT_X),
    y: clamp(((y - top) / height - 0.5) * MAX_TILT_Y * -2, -MAX_TILT_Y, MAX_TILT_Y)
  };
}
