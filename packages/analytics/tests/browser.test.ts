import { describe, it, expect } from 'vitest';
import { getBrowserInfo } from '../src/browser.js';

describe('getBrowserInfo()', () => {
  it('detects Chrome with version', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
    const info = getBrowserInfo(ua);
    expect(info.name).toBe('Chrome');
    expect(info.version).toBe('114.0.0.0');
  });

  it('detects Firefox with version', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0';
    const info = getBrowserInfo(ua);
    expect(info.name).toBe('Firefox');
    expect(info.version).toBe('109.0');
  });

  it('detects Safari with version', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';
    const info = getBrowserInfo(ua);
    expect(info.name).toBe('Safari');
    expect(info.version).toBe('16.0');
  });

  it('detects Edge with version', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43';
    const info = getBrowserInfo(ua);
    expect(info.name).toBe('Edge');
    expect(info.version).toBe('114.0.1823.43');
  });

  it('returns unknown for an unrecognised UA', () => {
    const info = getBrowserInfo('curl/7.68.0');
    expect(info.name).toBe('unknown');
    expect(info.version).toBeNull();
  });

  it('returns unknown for an empty string', () => {
    const info = getBrowserInfo('');
    expect(info.name).toBe('unknown');
    expect(info.version).toBeNull();
  });
});
