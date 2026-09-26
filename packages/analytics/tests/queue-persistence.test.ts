import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import { NoopEmitter } from '../src/emitter/NoopEmitter.js';
import { optOutManager } from '../src/optout.js';
import { PENDING_QUEUE_STORAGE_KEY } from '../src/lib/queuePersistence.js';
import type { AnalyticsEvent } from '../src/types.js';

function createFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } as Storage;
}

let beforeUnloadHandler: (() => void) | null = null;

function stubBrowser(storage: Storage): void {
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'beforeunload') beforeUnloadHandler = fn;
    },
    removeEventListener: (type: string) => {
      if (type === 'beforeunload') beforeUnloadHandler = null;
    },
  });
}

afterEach(() => {
  beforeUnloadHandler = null;
  optOutManager.optIn();
  vi.unstubAllGlobals();
});

describe('#85 persist pending queue on unload', () => {
  it('persists the pending queue to localStorage', () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    const client = new AnalyticsClient({}, new NoopEmitter());

    client.track('a');
    client.track('b');

    expect(client.persistQueueNow()).toBe(true);
    const saved = JSON.parse(storage.getItem(PENDING_QUEUE_STORAGE_KEY)!);
    expect((saved as AnalyticsEvent[]).map((e) => e.name)).toEqual(['a', 'b']);
  });

  it('registers a beforeunload handler that persists the queue', () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    const client = new AnalyticsClient({}, new NoopEmitter());

    expect(beforeUnloadHandler).not.toBeNull();
    client.track('x');
    beforeUnloadHandler!();

    expect(storage.getItem(PENDING_QUEUE_STORAGE_KEY)).toContain('"x"');
  });

  it('does not persist when the user has opted out', () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    optOutManager.optOut();
    const client = new AnalyticsClient({}, new NoopEmitter());

    client.track('a');
    expect(client.persistQueueNow()).toBe(false);
    expect(storage.getItem(PENDING_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it('leaves storage untouched when the queue is empty', () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    const client = new AnalyticsClient({}, new NoopEmitter());

    expect(client.persistQueueNow()).toBe(true);
    expect(storage.getItem(PENDING_QUEUE_STORAGE_KEY)).toBeNull();
  });
});

describe('#86 restore persisted queue on construction', () => {
  it('re-enqueues a previously persisted queue and clears storage', async () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    storage.setItem(
      PENDING_QUEUE_STORAGE_KEY,
      JSON.stringify([
        { name: 'leftover', timestamp: 0, properties: {} },
        { name: 'second', timestamp: 1, properties: {} },
      ]),
    );

    const emitter = { send: vi.fn().mockResolvedValue(undefined) };
    const client = new AnalyticsClient({}, emitter);

    expect(storage.getItem(PENDING_QUEUE_STORAGE_KEY)).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(emitter.send).toHaveBeenCalledTimes(2);
    expect(emitter.send).toHaveBeenCalledWith({
      name: 'leftover',
      timestamp: 0,
      properties: {},
    });
    expect(emitter.send).toHaveBeenCalledWith({
      name: 'second',
      timestamp: 1,
      properties: {},
    });
    expect(client.getQueue().size).toBe(0);
  });

  it('ignores corrupted persisted data', () => {
    const storage = createFakeStorage();
    stubBrowser(storage);
    storage.setItem(PENDING_QUEUE_STORAGE_KEY, 'definitely-not-json');

    const client = new AnalyticsClient({}, new NoopEmitter());

    expect(client.getQueue().size).toBe(0);
  });

  it('restores nothing when nothing was persisted', () => {
    stubBrowser(createFakeStorage());
    const client = new AnalyticsClient({}, new NoopEmitter());
    expect(client.getQueue().size).toBe(0);
  });
});

describe('#119 queue persistence under private browsing and quota exceeded', () => {
  it('returns false and does not throw when storage is unavailable in private browsing', () => {
    const storage = createFakeStorage();
    storage.setItem = vi.fn().mockImplementation(() => {
      throw new DOMException('Private browsing access denied', 'SecurityError');
    });
    stubBrowser(storage);

    const client = new AnalyticsClient({}, new NoopEmitter());
    client.track('event_private');

    expect(client.persistQueueNow()).toBe(false);
  });

  it('returns false and does not throw when localStorage quota is exceeded', () => {
    const storage = createFakeStorage();
    storage.setItem = vi.fn().mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    stubBrowser(storage);

    const client = new AnalyticsClient({}, new NoopEmitter());
    client.track('event_quota');

    expect(client.persistQueueNow()).toBe(false);
  });

  it('safely handles unload event when storage throws quota exceeded', () => {
    const storage = createFakeStorage();
    storage.setItem = vi.fn().mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    stubBrowser(storage);

    const client = new AnalyticsClient({}, new NoopEmitter());
    client.track('unload_event');

    expect(() => {
      if (beforeUnloadHandler) beforeUnloadHandler();
    }).not.toThrow();
  });
});