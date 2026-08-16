import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/client/api.js';

const BASE_URL = 'https://stellar-explain-core.onrender.com';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a friendly message when API returns non-JSON response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'content-type': 'text/html' },
      })
    );

    const client = new ApiClient(BASE_URL, 10_000);
    await expect(client.health()).rejects.toThrow('Unexpected response from API');
  });

  it('throws a friendly message on network timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((_, reject) => {
          const err = new DOMException('The operation was aborted', 'AbortError');
          reject(err);
        })
    );

    const client = new ApiClient(BASE_URL, 100);
    await expect(client.health()).rejects.toThrow('Request timed out after');
  });

  it('throws a friendly message on connection refused', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed: reason: ECONNREFUSED')
    );

    const client = new ApiClient('http://localhost:1');
    await expect(client.health()).rejects.toThrow('Connection refused');
  });

  it('throws a friendly message on DNS failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed: ENOTFOUND nonexistent.example.com')
    );

    const client = new ApiClient('http://nonexistent.example.com');
    await expect(client.health()).rejects.toThrow('Cannot reach');
  });

  it('includes response body text in API error messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Service Unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    );

    const client = new ApiClient(BASE_URL, 10_000);
    await expect(client.health()).rejects.toThrow('API error: 503');
  });
});
