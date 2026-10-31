/** Only render the decorative WebGL background while it can be seen. */
export function canRenderSmokeFrame(disposed, documentVisible, intersecting) {
  return !disposed && documentVisible && intersecting;
}
