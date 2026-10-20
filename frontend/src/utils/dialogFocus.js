/**
 * Return the focusable element index when Tab reaches a modal boundary.
 * -1 means native Tab order can continue without wrapping.
 */
export function getDialogFocusWrapIndex(activeIndex, itemCount, backwards) {
  if (!Number.isInteger(activeIndex) || !Number.isInteger(itemCount) || itemCount < 1) return -1;
  if (backwards && activeIndex === 0) return itemCount - 1;
  if (!backwards && activeIndex === itemCount - 1) return 0;
  return -1;
}
