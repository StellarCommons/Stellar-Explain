import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('cacheGet / cacheSet round-trip', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should store and retrieve a value from memory', async () => {
    const { cacheSet, cacheGet } = await import('../src/utils/cache.js');
    cacheSet('test-key', { hello: 'world' }, 60_000);
    const result = cacheGet<{ hello: string }>('test-key');
    expect(result).toEqual({ hello: 'world' });
  });

  it('should return null for a missing key', async () => {
    const { cacheGet } = await import('../src/utils/cache.js');
    const result = cacheGet('nonexistent');
    expect(result).toBeNull();
  });

  it('should return null for an expired entry', async () => {
    const { cacheSet, cacheGet } = await import('../src/utils/cache.js');
    cacheSet('expired-key', 'value', -1);
    const result = cacheGet('expired-key');
    expect(result).toBeNull();
  });
});

describe('disk cache unavailable fallback', () => {
  it('should fall back to in-memory cache when mkdir fails', async () => {
    vi.resetModules();

    const mkdirError = new Error('EACCES: permission denied');
    vi.doMock('node:fs', async () => {
      return {
        existsSync: () => false,
        mkdirSync: () => {
          throw mkdirError;
        },
        readFileSync: () => '{}',
        writeFileSync: () => {},
        unlinkSync: () => {},
      };
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { cacheSet, cacheGet } = await import('../src/utils/cache.js');
    cacheSet('fallback-key', { data: 42 }, 60_000);
    const result = cacheGet<{ data: number }>('fallback-key');
    expect(result).toEqual({ data: 42 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not create cache directory')
    );
    warnSpy.mockRestore();
  });
});
