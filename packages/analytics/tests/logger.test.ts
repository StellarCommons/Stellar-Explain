import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../src/lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── disabled (default) ────────────────────────────────────────────────────────

  describe('when disabled', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger(false);
    });

    it('does not call console.debug', () => {
      logger.debug('test message');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('does not call console.info', () => {
      logger.info('test message');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('does not call console.warn', () => {
      logger.warn('test message');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not call console.error', () => {
      logger.error('test message');
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  // ── enabled ───────────────────────────────────────────────────────────────────

  describe('when enabled', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger(true);
    });

    it('calls console.debug with [analytics] prefix and message', () => {
      logger.debug('hello debug');
      expect(console.debug).toHaveBeenCalledWith('[analytics]', 'hello debug');
    });

    it('calls console.info with [analytics] prefix and message', () => {
      logger.info('hello info');
      expect(console.info).toHaveBeenCalledWith('[analytics]', 'hello info');
    });

    it('calls console.warn with [analytics] prefix and message', () => {
      logger.warn('hello warn');
      expect(console.warn).toHaveBeenCalledWith('[analytics]', 'hello warn');
    });

    it('calls console.error with [analytics] prefix and message', () => {
      logger.error('hello error');
      expect(console.error).toHaveBeenCalledWith('[analytics]', 'hello error');
    });

    it('forwards extra arguments to console.debug', () => {
      logger.debug('msg', { extra: true }, 42);
      expect(console.debug).toHaveBeenCalledWith('[analytics]', 'msg', { extra: true }, 42);
    });
  });
});
