import { describe, it, expect, vi } from 'vitest';
import { limitPayload } from '../src/utils/limitPayload.js';
import { Logger } from '../src/lib/logger.js';

function makeLogger(): Logger {
  return new Logger(false);
}

describe('limitPayload', () => {
  it('passes through small values unchanged', () => {
    const logger = makeLogger();
    const props = { name: 'Alice', age: 30 };
    const result = limitPayload(props, 1024, logger);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('truncates a string value that exceeds maxBytes', () => {
    const logger = makeLogger();
    const bigString = 'x'.repeat(2000);
    const props = { data: bigString };
    const result = limitPayload(props, 100, logger);
    // JSON.stringify('xxx...') adds surrounding quotes — but limitPayload
    // slices the serialized form, so result[key] is a string of length 100
    expect(typeof result['data']).toBe('string');
    expect((result['data'] as string).length).toBe(100);
  });

  it('logs a warning when a property is truncated', () => {
    const logger = makeLogger();
    const warnSpy = vi.spyOn(logger, 'warn');
    const bigString = 'y'.repeat(500);
    limitPayload({ payload: bigString }, 50, logger);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"payload"'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('50 bytes'));
  });

  it('does not log a warning for values within limit', () => {
    const logger = makeLogger();
    const warnSpy = vi.spyOn(logger, 'warn');
    limitPayload({ small: 'hello' }, 1024, logger);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('handles multiple properties — only oversized ones are truncated', () => {
    const logger = makeLogger();
    const warnSpy = vi.spyOn(logger, 'warn');
    const props = {
      small: 'ok',
      big: 'z'.repeat(300),
    };
    const result = limitPayload(props, 50, logger);
    expect(result['small']).toBe('ok');
    expect((result['big'] as string).length).toBe(50);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('handles non-string values (objects) by serializing and truncating', () => {
    const logger = makeLogger();
    const largeObj = { a: 'x'.repeat(500) };
    const result = limitPayload({ nested: largeObj }, 20, logger);
    expect(typeof result['nested']).toBe('string');
    expect((result['nested'] as string).length).toBe(20);
  });
});
