/** Subscribe to MediaQueryList changes across modern and legacy browser APIs. */
export function subscribeMediaQuery(mediaQuery, listener) {
  if (!mediaQuery || typeof listener !== 'function') return () => {};

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener?.('change', listener);
  }

  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener?.(listener);
  }

  return () => {};
}
