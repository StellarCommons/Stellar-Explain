import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsClient, NoopEmitter } from '../src/index.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetch capability fallback', () => {
  it('uses NoopEmitter and warns once when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = new AnalyticsClient({ endpoint: 'https://ingest.example.test/events' });

    expect(client.getEmitter()).toBeInstanceOf(NoopEmitter);
    client.track('safe_event');
    await client.flush();
    await client.flush();

    expect(warning).toHaveBeenCalledTimes(1);
    expect(String(warning.mock.calls[0]?.[1])).toContain('fetch.unavailable');
  });

  it('does not warn when a caller supplies a fetch implementation', () => {
    vi.stubGlobal('fetch', undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const client = new AnalyticsClient({
      endpoint: 'https://ingest.example.test/events',
      fetchImpl,
    });

    expect(client.getEmitter()).not.toBeInstanceOf(NoopEmitter);
    expect(warning).not.toHaveBeenCalled();
  });
});
