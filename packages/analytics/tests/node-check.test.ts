import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  MINIMUM_NODE_MAJOR,
  checkNodeVersion,
  getNodeMajorVersion,
  isSupportedNodeVersion,
  parseNodeMajor,
  resetNodeVersionWarningForTests,
} from '../src/utils/node-check';

describe('node-check (Analytics #125)', () => {
  beforeEach(() => {
    resetNodeVersionWarningForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetNodeVersionWarningForTests();
  });

  describe('parseNodeMajor', () => {
    it('parses plain and v-prefixed versions', () => {
      expect(parseNodeMajor('18.19.0')).toBe(18);
      expect(parseNodeMajor('v20.11.1')).toBe(20);
      expect(parseNodeMajor('22')).toBe(22);
    });

    it('returns undefined for malformed versions', () => {
      expect(parseNodeMajor('')).toBeUndefined();
      expect(parseNodeMajor('not-a-version')).toBeUndefined();
    });
  });

  describe('minimum version', () => {
    it('targets Node.js 18+', () => {
      expect(MINIMUM_NODE_MAJOR).toBe(18);
    });

    it('current runtime satisfies the minimum', () => {
      const major = getNodeMajorVersion();
      // In CI this runs under Node 18+; in non-Node runtimes it is undefined.
      if (major !== undefined) {
        expect(isSupportedNodeVersion()).toBe(true);
      } else {
        expect(isSupportedNodeVersion()).toBeUndefined();
      }
    });
  });

  describe('checkNodeVersion', () => {
    it('does not warn on a supported runtime', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      checkNodeVersion();
      // Supported or unknown runtimes stay silent.
      if (isSupportedNodeVersion() !== false) {
        expect(warn).not.toHaveBeenCalled();
      }
    });

    it('never throws', () => {
      expect(() => checkNodeVersion()).not.toThrow();
    });
  });
});
