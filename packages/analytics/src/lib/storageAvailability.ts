export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function isLocalStorageAvailable(): boolean {
  return isStorageAvailable('localStorage');
}

export function isSessionStorageAvailable(): boolean {
  return isStorageAvailable('sessionStorage');
}
