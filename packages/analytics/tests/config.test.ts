import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../src/config.js';
import type { AnalyticsConfig } from '../src/config.js';

describe('resolveConfig', () => {
  describe('defaults', () => {
    it('fills flushIntervalMs with 5000 when not provided', () => {
      const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
      expect(config.flushIntervalMs).toBe(5000);
    });

    it('fills maxQueueSize with 100 when not provided', () => {
      const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
      expect(config.maxQueueSize).toBe(100);
    });

    it('fills sampleRate with 1.0 when not provided', () => {
      const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
      expect(config.sampleRate).toBe(1.0);
    });

    it('fills debug with false when not provided', () => {
      const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
      expect(config.debug).toBe(false);
    });

    it('leaves apiKey undefined when not provided', () => {
      const config = resolveConfig({ endpoint: 'https://ingest.example.com' });
      expect(config.apiKey).toBeUndefined();
    });

    it('uses empty string for endpoint when not provided', () => {
      const config = resolveConfig({});
      expect(config.endpoint).toBe('');
    });
  });

  describe('custom values override defaults', () => {
    it('uses the provided endpoint', () => {
      const config = resolveConfig({ endpoint: 'https://custom.example.com/events' });
      expect(config.endpoint).toBe('https://custom.example.com/events');
    });

    it('uses the provided apiKey', () => {
      const config = resolveConfig({
        endpoint: 'https://ingest.example.com',
        apiKey: 'my-secret-key',
      });
      expect(config.apiKey).toBe('my-secret-key');
    });

    it('uses the provided debug flag', () => {
      const config = resolveConfig({
        endpoint: 'https://ingest.example.com',
        debug: true,
      });
      expect(config.debug).toBe(true);
    });

    it('uses the provided flushIntervalMs', () => {
      const config = resolveConfig({
        endpoint: 'https://ingest.example.com',
        flushIntervalMs: 10000,
      });
      expect(config.flushIntervalMs).toBe(10000);
    });

    it('uses the provided maxQueueSize', () => {
      const config = resolveConfig({
        endpoint: 'https://ingest.example.com',
        maxQueueSize: 250,
      });
      expect(config.maxQueueSize).toBe(250);
    });

    it('uses the provided sampleRate', () => {
      const config = resolveConfig({
        endpoint: 'https://ingest.example.com',
        sampleRate: 0.5,
      });
      expect(config.sampleRate).toBe(0.5);
    });

    it('applies all custom values at once', () => {
      const options: Partial<AnalyticsConfig> = {
        endpoint: 'https://api.example.com',
        apiKey: 'key-123',
        debug: true,
        flushIntervalMs: 2000,
        maxQueueSize: 50,
        sampleRate: 0.1,
      };
      const config = resolveConfig(options);

      expect(config.endpoint).toBe('https://api.example.com');
      expect(config.apiKey).toBe('key-123');
      expect(config.debug).toBe(true);
      expect(config.flushIntervalMs).toBe(2000);
      expect(config.maxQueueSize).toBe(50);
      expect(config.sampleRate).toBe(0.1);
    });
  });

  it('returns a fully-resolved config with no undefined required fields', () => {
    const config = resolveConfig({ endpoint: 'https://ingest.example.com' });

    expect(config.endpoint).toBeDefined();
    expect(config.debug).toBeDefined();
    expect(config.flushIntervalMs).toBeDefined();
    expect(config.maxQueueSize).toBeDefined();
    expect(config.sampleRate).toBeDefined();
  });
});
