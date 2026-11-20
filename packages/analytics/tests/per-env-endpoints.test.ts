import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('#100 per-environment endpoint config', () => {
  it('resolves the endpoint for the active environment', () => {
    const config = resolveConfig({
      environment: 'production',
      endpointConfig: { production: 'https://prod.ingest.example.com' },
    });
    expect(config.endpoint).toBe('https://prod.ingest.example.com');
  });

  it('an explicit endpoint always wins over the environment map', () => {
    const config = resolveConfig({
      endpoint: 'https://custom.example.com',
      environment: 'production',
      endpointConfig: { production: 'https://prod.ingest.example.com' },
    });
    expect(config.endpoint).toBe('https://custom.example.com');
  });

  it('keeps the default empty endpoint for an unknown environment', () => {
    const config = resolveConfig({
      environment: 'staging',
      endpointConfig: { production: 'https://prod.ingest.example.com' },
    });
    expect(config.endpoint).toBe('');
  });

  it('works alongside standard options', () => {
    const config = resolveConfig({
      environment: 'test',
      endpointConfig: { test: 'https://test.ingest.example.com' },
      flushIntervalMs: 1000,
      maxQueueSize: 50,
    });
    expect(config.endpoint).toBe('https://test.ingest.example.com');
    expect(config.flushIntervalMs).toBe(1000);
    expect(config.maxQueueSize).toBe(50);
  });
});