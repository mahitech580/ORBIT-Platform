const DEFAULT_MAX_DEVICE_PIXEL_RATIO = 1.35;

/** Calculate a bounded WebGL backing size from the element's current CSS box. */
export function getCanvasBackingSize(width, height, devicePixelRatio, maxDevicePixelRatio = DEFAULT_MAX_DEVICE_PIXEL_RATIO) {
  const cssWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const cssHeight = Number.isFinite(height) && height > 0 ? height : 0;
  const maxRatio = Number.isFinite(maxDevicePixelRatio) && maxDevicePixelRatio > 0
    ? maxDevicePixelRatio
    : DEFAULT_MAX_DEVICE_PIXEL_RATIO;
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? Math.min(devicePixelRatio, maxRatio)
    : 1;

  return {
    width: Math.max(1, Math.floor(cssWidth * ratio)),
    height: Math.max(1, Math.floor(cssHeight * ratio))
  };
}
