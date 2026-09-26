import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isStorageAvailable,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
} from '../src/lib/storageAvailability.js';

describe('storageAvailability (#35, #119)', () => {
  function createWorkingStorage(): Storage {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    } as Storage;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('happy path', () => {
    it('returns true when localStorage is available and writable', () => {
      const storage = createWorkingStorage();
      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(true);
      expect(isStorageAvailable('localStorage')).toBe(true);
      // Ensures the test key was cleaned up
      expect(storage.getItem('__storage_test__')).toBeNull();
    });

    it('returns true when sessionStorage is available and writable', () => {
      const storage = createWorkingStorage();
      vi.stubGlobal('window', { sessionStorage: storage });

      expect(isSessionStorageAvailable()).toBe(true);
      expect(isStorageAvailable('sessionStorage')).toBe(true);
      expect(storage.getItem('__storage_test__')).toBeNull();
    });
  });

  describe('SSR / Node environment', () => {
    it('returns false when window is undefined', () => {
      vi.stubGlobal('window', undefined);

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isSessionStorageAvailable()).toBe(false);
      expect(isStorageAvailable('localStorage')).toBe(false);
      expect(isStorageAvailable('sessionStorage')).toBe(false);
    });
  });

  describe('private browsing scenarios (#119)', () => {
    it('returns false when accessing window.localStorage throws SecurityError (Safari private mode)', () => {
      const win = {};
      Object.defineProperty(win, 'localStorage', {
        get() {
          const err = new DOMException(
            'The operation is insecure.',
            'SecurityError',
          );
          throw err;
        },
      });
      vi.stubGlobal('window', win);

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isStorageAvailable('localStorage')).toBe(false);
    });

    it('returns false when accessing window.sessionStorage throws SecurityError', () => {
      const win = {};
      Object.defineProperty(win, 'sessionStorage', {
        get() {
          throw new DOMException('Access denied in private window', 'SecurityError');
        },
      });
      vi.stubGlobal('window', win);

      expect(isSessionStorageAvailable()).toBe(false);
      expect(isStorageAvailable('sessionStorage')).toBe(false);
    });

    it('returns false when storage.setItem throws QuotaExceededError with code 22 (legacy Safari private mode)', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        const error = new DOMException(
          'QuotaExceededError: The quota has been exceeded.',
          'QuotaExceededError',
        );
        Object.defineProperty(error, 'code', { value: 22 });
        throw error;
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isStorageAvailable('localStorage')).toBe(false);
    });

    it('returns false when Firefox private browsing throws NS_ERROR_DOM_SECURITY_ERR', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        const err = new DOMException(
          'Security error: The operation is insecure.',
          'NS_ERROR_DOM_SECURITY_ERR',
        );
        throw err;
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('returns false when window[type] is null (restricted cross-origin/sandbox iframe)', () => {
      vi.stubGlobal('window', { localStorage: null, sessionStorage: null });

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isSessionStorageAvailable()).toBe(false);
    });

    it('returns false when window[type] is undefined', () => {
      vi.stubGlobal('window', {});

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isSessionStorageAvailable()).toBe(false);
    });
  });

  describe('quota exceeded scenarios (#119)', () => {
    it('returns false when localStorage has reached maximum capacity (QuotaExceededError)', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        const err = new DOMException('Persistent storage quota exceeded', 'QuotaExceededError');
        throw err;
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isStorageAvailable('localStorage')).toBe(false);
    });

    it('returns false when sessionStorage is quota exceeded', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        const err = new DOMException('Session storage quota exceeded', 'QuotaExceededError');
        throw err;
      });

      vi.stubGlobal('window', { sessionStorage: storage });

      expect(isSessionStorageAvailable()).toBe(false);
      expect(isStorageAvailable('sessionStorage')).toBe(false);
    });

    it('returns false when setItem throws generic disk full error', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Disk full: unable to write storage entry');
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('returns false when Firefox throws NS_ERROR_DOM_QUOTA_REACHED (code 1014)', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        const error = new DOMException(
          'Persistent storage max capacity reached',
          'NS_ERROR_DOM_QUOTA_REACHED',
        );
        Object.defineProperty(error, 'code', { value: 1014 });
        throw error;
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('storage mutation, cleanup, and corrupted edge cases', () => {
    it('returns false when removeItem throws an exception', () => {
      const storage = createWorkingStorage();
      storage.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Failed to remove item: read-only storage partition');
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('returns false when storage throws a non-Error string literal', () => {
      const storage = createWorkingStorage();
      storage.setItem = vi.fn().mockImplementation(() => {
        throw 'CustomQuotaExceeded';
      });

      vi.stubGlobal('window', { localStorage: storage });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('returns false when setItem is not a function', () => {
      const brokenStorage = {
        setItem: null,
        removeItem: null,
      } as unknown as Storage;

      vi.stubGlobal('window', { localStorage: brokenStorage });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('checks localStorage and sessionStorage independently', () => {
      const workingStorage = createWorkingStorage();
      const fullStorage = createWorkingStorage();
      fullStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException('Quota full', 'QuotaExceededError');
      });

      vi.stubGlobal('window', {
        localStorage: fullStorage,
        sessionStorage: workingStorage,
      });

      expect(isLocalStorageAvailable()).toBe(false);
      expect(isSessionStorageAvailable()).toBe(true);
    });
  });
});
