import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClient } from '../src/client.js';
import type { Emitter } from '../src/emitter/index.js';
import { NoopEmitter } from '../src/emitter/NoopEmitter.js';
import type { AnalyticsEvent } from '../src/types.js';

describe('Emitter wiring', () => {
  it('uses NoopEmitter by default', () => {
    const client = new AnalyticsClient();
    expect(client.getEmitter()).toBeInstanceOf(NoopEmitter);
  });

  it('stores the provided custom emitter', () => {
    const customEmitter: Emitter = { send: vi.fn() };
    const client = new AnalyticsClient(undefined, customEmitter);
    expect(client.getEmitter()).toBe(customEmitter);
  });

  it('NoopEmitter.send() does not throw', () => {
    const emitter = new NoopEmitter();
    const event: AnalyticsEvent = { name: 'test', timestamp: Date.now(), properties: {} };
    expect(() => emitter.send(event)).not.toThrow();
  });

  it('NoopEmitter.send() returns undefined', () => {
    const emitter = new NoopEmitter();
    const event: AnalyticsEvent = { name: 'test', timestamp: Date.now(), properties: {} };
    expect(emitter.send(event)).toBeUndefined();
  });

  it('custom emitter send() is accessible via getEmitter()', () => {
    const sendFn = vi.fn();
    const customEmitter: Emitter = { send: sendFn };
    const client = new AnalyticsClient(undefined, customEmitter);
    // track() routes through queue, but emitter is stored and accessible
    expect(client.getEmitter()).toBe(customEmitter);
    expect(client.getEmitter().send).toBe(sendFn);
  });

  it('two clients with different emitters stay independent', () => {
    const emitterA: Emitter = { send: vi.fn() };
    const emitterB: Emitter = { send: vi.fn() };
    const clientA = new AnalyticsClient(undefined, emitterA);
    const clientB = new AnalyticsClient(undefined, emitterB);
    expect(clientA.getEmitter()).toBe(emitterA);
    expect(clientB.getEmitter()).toBe(emitterB);
    expect(clientA.getEmitter()).not.toBe(clientB.getEmitter());
  });
});
