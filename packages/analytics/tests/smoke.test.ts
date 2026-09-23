import { describe, expect, it } from 'vitest';
import { ANALYTICS_PACKAGE_VERSION } from '../src/index';

describe('analytics package foundation', () => {
  it('builds and exports a version', () => {
    expect(ANALYTICS_PACKAGE_VERSION).toBe('0.1.0');
  });
});
