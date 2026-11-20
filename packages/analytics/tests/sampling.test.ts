import { describe, it, expect, vi, afterEach } from 'vitest';
import { shouldSample } from '../src/sampling.js';

describe('shouldSample', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always returns true when sampleRate is 1', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldSample(1)).toBe(true);
    }
  });

  it('always returns true when sampleRate > 1', () => {
    expect(shouldSample(1.5)).toBe(true);
    expect(shouldSample(2)).toBe(true);
  });

  it('always returns false when sampleRate is 0', () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldSample(0)).toBe(false);
    }
  });

  it('always returns false when sampleRate < 0', () => {
    expect(shouldSample(-0.5)).toBe(false);
    expect(shouldSample(-1)).toBe(false);
  });

  it('returns true when Math.random() is below sampleRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    expect(shouldSample(0.5)).toBe(true);
  });

  it('returns false when Math.random() equals sampleRate (not strictly less than)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(shouldSample(0.5)).toBe(false);
  });

  it('returns false when Math.random() is above sampleRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(shouldSample(0.5)).toBe(false);
  });

  it('probabilistically drops ~50% of events at sampleRate=0.5 (mocked)', () => {
    const mockRandom = vi.spyOn(Math, 'random');
    // Alternate below/above 0.5
    let callCount = 0;
    mockRandom.mockImplementation(() => (callCount++ % 2 === 0 ? 0.3 : 0.7));

    let trueCount = 0;
    const total = 100;
    for (let i = 0; i < total; i++) {
      if (shouldSample(0.5)) trueCount++;
    }
    expect(trueCount).toBe(50);
  });
});
