import type { Logger } from '../lib/logger.js';

export interface LimitPayloadOptions {
  maxStringLength?: number;
  maxDepth?: number;
  logger?: Logger;
  eventName?: string;
}

/**
 * Return a bounded copy of a JSON-like value. Strings are truncated and
 * arrays/objects are traversed to a configurable depth.
 */
export function limitPayload(value: unknown, options: LimitPayloadOptions = {}): unknown {
  const maxStringLength = Math.max(0, options.maxStringLength ?? 1_024);
  const maxDepth = Math.max(0, options.maxDepth ?? 5);

  const visit = (current: unknown, depth: number): unknown => {
    if (typeof current === 'string') {
      if (current.length <= maxStringLength) return current;
      options.logger?.log('warn', 'payload.truncate', {
        eventName: options.eventName,
        originalLength: current.length,
        maxStringLength,
      });
      return `${current.slice(0, maxStringLength)}…`;
    }
    if (current === null || typeof current !== 'object') return current;
    if (depth >= maxDepth) return '[truncated]';
    if (Array.isArray(current)) {
      return current.map((item) => visit(item, depth + 1));
    }
    return Object.fromEntries(
      Object.entries(current as Record<string, unknown>).map(([key, item]) => [
        key,
        visit(item, depth + 1),
      ]),
    );
  };

  return visit(value, 0);
}
