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

  describe('explicit undefined and input ownership', () => {
    it('uses defaults for explicitly undefined values', () => {
      const config = resolveConfig({
        endpoint: 'https://ingest.example.com',
        debug: undefined,
        flushIntervalMs: undefined,
        maxQueueSize: undefined,
        sampleRate: undefined,
        maxPropertyBytes: undefined,
        maxEventsPerSecond: undefined,
      });

      expect(config.debug).toBe(false);
      expect(config.flushIntervalMs).toBe(5000);
      expect(config.maxQueueSize).toBe(100);
      expect(config.sampleRate).toBe(1);
      expect(config.maxPropertyBytes).toBe(1024);
      expect(config.maxEventsPerSecond).toBe(100);
    });

    it('copies a complete config instead of returning or mutating it', () => {
      const options: Partial<AnalyticsConfig> = {
        endpoint: 'https://ingest.example.com',
        debug: true,
        flushIntervalMs: 1000,
        maxQueueSize: 10,
        sampleRate: 0.5,
      };

      const config = resolveConfig(options);

      expect(config).not.toBe(options);
      expect(config).toEqual(options);
      expect(options.endpoint).toBe('https://ingest.example.com');
    });

    it('does not mutate endpointConfig when deriving the endpoint', () => {
      const endpointConfig = { production: 'https://prod.example.com' };
      const options: Partial<AnalyticsConfig> = {
        endpoint: '',
        debug: false,
        flushIntervalMs: 1000,
        maxQueueSize: 10,
        sampleRate: 1,
        environment: 'production',
        endpointConfig,
      };

      const config = resolveConfig(options);

      expect(config.endpoint).toBe('https://prod.example.com');
      expect(options.endpoint).toBe('');
      expect(endpointConfig).toEqual({ production: 'https://prod.example.com' });
      expect(config).not.toBe(options);
    });
  });

  describe('numeric validation', () => {
    it.each([-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'rejects invalid sampleRate %s',
      (sampleRate) => {
        expect(() => resolveConfig({ sampleRate })).toThrow(TypeError);
        expect(() => resolveConfig({ sampleRate })).toThrow(/sampleRate/);
      },
    );

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'rejects invalid flushIntervalMs %s',
      (flushIntervalMs) => {
        expect(() => resolveConfig({ flushIntervalMs })).toThrow(TypeError);
        expect(() => resolveConfig({ flushIntervalMs })).toThrow(/flushIntervalMs/);
      },
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'rejects invalid maxQueueSize %s',
      (maxQueueSize) => {
        expect(() => resolveConfig({ maxQueueSize })).toThrow(TypeError);
        expect(() => resolveConfig({ maxQueueSize })).toThrow(/maxQueueSize/);
      },
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'rejects invalid maxPropertyBytes %s',
      (maxPropertyBytes) => {
        expect(() => resolveConfig({ maxPropertyBytes })).toThrow(TypeError);
        expect(() => resolveConfig({ maxPropertyBytes })).toThrow(/maxPropertyBytes/);
      },
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'rejects invalid maxEventsPerSecond %s',
      (maxEventsPerSecond) => {
        expect(() => resolveConfig({ maxEventsPerSecond })).toThrow(TypeError);
        expect(() => resolveConfig({ maxEventsPerSecond })).toThrow(/maxEventsPerSecond/);
      },
    );

    it('rejects non-numeric values', () => {
      expect(() => resolveConfig({ sampleRate: 'fast' as unknown as number })).toThrow(TypeError);
    });

    it('accepts boundary values', () => {
      const config = resolveConfig({
        sampleRate: 0,
        flushIntervalMs: 0,
        maxQueueSize: 1,
        maxPropertyBytes: 1,
        maxEventsPerSecond: 1,
      });

      expect(config.sampleRate).toBe(0);
      expect(config.flushIntervalMs).toBe(0);
      expect(config.maxQueueSize).toBe(1);
      expect(config.maxPropertyBytes).toBe(1);
      expect(config.maxEventsPerSecond).toBe(1);
    });
  });
});
