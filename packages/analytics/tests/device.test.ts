import { describe, it, expect } from 'vitest';
import { getDeviceType } from '../src/device.js';

describe('getDeviceType()', () => {
  it('returns "mobile" for an iPhone UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
    expect(getDeviceType(ua)).toBe('mobile');
  });

  it('returns "mobile" for an Android phone UA', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Mobile Safari/537.36';
    expect(getDeviceType(ua)).toBe('mobile');
  });

  it('returns "tablet" for an iPad UA', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(getDeviceType(ua)).toBe('tablet');
  });

  it('returns "tablet" for a Silk UA', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 9; KFMAWI) Silk/95.3.3';
    expect(getDeviceType(ua)).toBe('tablet');
  });

  it('returns "desktop" for a Windows desktop Chrome UA', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36';
    expect(getDeviceType(ua)).toBe('desktop');
  });

  it('returns "desktop" for a macOS Safari UA', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 Version/16.0 Safari/605.1.15';
    expect(getDeviceType(ua)).toBe('desktop');
  });

  it('returns "unknown" for an empty string', () => {
    expect(getDeviceType('')).toBe('unknown');
  });

  it('returns "unknown" when called with no argument and not in a browser', () => {
    // In the vitest (Node) environment there is no navigator, so isBrowser() returns false.
    expect(getDeviceType(undefined)).toBe('unknown');
  });
});
