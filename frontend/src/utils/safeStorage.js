function resolveStorage(storage) {
  return storage === undefined ? globalThis.localStorage : storage;
}

export function getStorageItem(key, storage) {
  try {
    return resolveStorage(storage)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setStorageItem(key, value, storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key, storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
