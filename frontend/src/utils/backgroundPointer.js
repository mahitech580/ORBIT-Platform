/** Avoid pointer-driven shader updates for touch and non-primary pointers. */
export function shouldTrackBackgroundPointer(event, reducedMotion) {
  return !reducedMotion && Boolean(event) &&
    event.pointerType !== 'touch' &&
    event.isPrimary !== false;
}
