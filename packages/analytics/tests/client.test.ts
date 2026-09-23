import { describe, expect, it } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import { resolveConfig } from '../src/config.js';
import type { AnalyticsConfig } from '../src/config.js';

// A minimal subclass that exposes the protected `config` field for testing
class TestableAnalyticsClient extends AnalyticsClient {
  public getConfig(): AnalyticsConfig {
    return this.config;
  }
}

describe('AnalyticsClient', () => {
  it('constructs without throwing', () => {
    const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
    expect(() => new AnalyticsClient(config)).not.toThrow();
  });

  it('stores the config passed to the constructor', () => {
    const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
    const client = new TestableAnalyticsClient(config);
    expect(client.getConfig()).toBe(config);
  });

  it('stores the endpoint from the config', () => {
    const config = resolveConfig({ endpoint: 'https://custom.example.com/events' });
    const client = new TestableAnalyticsClient(config);
    expect(client.getConfig().endpoint).toBe('https://custom.example.com/events');
  });

  it('stores the apiKey from the config when provided', () => {
    const config = resolveConfig({
      endpoint: 'https://ingest.example.com',
      apiKey: 'my-api-key',
    });
    const client = new TestableAnalyticsClient(config);
    expect(client.getConfig().apiKey).toBe('my-api-key');
  });

  it('stores resolved defaults in the config', () => {
    const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
    const client = new TestableAnalyticsClient(config);
    const stored = client.getConfig();

    expect(stored.flushIntervalMs).toBe(5000);
    expect(stored.maxQueueSize).toBe(100);
    expect(stored.sampleRate).toBe(1.0);
    expect(stored.debug).toBe(false);
  });

  it('stores custom config values correctly', () => {
    const config = resolveConfig({
      endpoint: 'https://ingest.example.com',
      flushIntervalMs: 3000,
      maxQueueSize: 50,
      sampleRate: 0.25,
      debug: true,
    });
    const client = new TestableAnalyticsClient(config);
    const stored = client.getConfig();

    expect(stored.flushIntervalMs).toBe(3000);
    expect(stored.maxQueueSize).toBe(50);
    expect(stored.sampleRate).toBe(0.25);
    expect(stored.debug).toBe(true);
  });
});
