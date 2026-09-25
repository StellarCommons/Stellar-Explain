import { describe, it, expect } from 'vitest';
import { getOsInfo } from '../src/os.js';

describe('getOsInfo()', () => {
  it('detects Windows with version', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const info = getOsInfo(ua);
    expect(info.name).toBe('Windows');
    expect(info.version).toBe('10.0');
  });

  it('detects macOS with version (underscores converted to dots)', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
    const info = getOsInfo(ua);
    expect(info.name).toBe('macOS');
    expect(info.version).toBe('10.15.7');
  });

  it('detects Android with version', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36';
    const info = getOsInfo(ua);
    expect(info.name).toBe('Android');
    expect(info.version).toBe('12');
  });

  it('detects iOS with version (underscores converted to dots)', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
    const info = getOsInfo(ua);
    expect(info.name).toBe('iOS');
    expect(info.version).toBe('16.0');
  });

  it('detects Linux without version', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
    const info = getOsInfo(ua);
    expect(info.name).toBe('Linux');
    expect(info.version).toBeNull();
  });

  it('returns unknown for an unrecognised UA', () => {
    const info = getOsInfo('SomeCustomBot/1.0');
    expect(info.name).toBe('unknown');
    expect(info.version).toBeNull();
  });

  it('returns unknown for an empty string', () => {
    const info = getOsInfo('');
    expect(info.name).toBe('unknown');
    expect(info.version).toBeNull();
  });
});
