import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClient } from '../src/index.js';
import type { Plugin } from '../src/plugins.js';
import { PluginRegistry } from '../src/plugins.js';
import { Middleware } from '../src/middleware.js';
import type { AnalyticsEvent } from '../src/types.js';

describe('#98 PluginRegistry', () => {
  it('registers and lists plugins in order', () => {
    const registry = new PluginRegistry();
    const p1: Plugin = { name: 'one' };
    const p2: Plugin = { name: 'two' };
    registry.register(p1);
    registry.register(p2);
    expect(registry.getPlugins()).toEqual([p1, p2]);
  });

  it('clears all plugins', () => {
    const registry = new PluginRegistry();
    registry.register({ name: 'one' });
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

describe('#99 Middleware', () => {
  it('process() runs hooks in order producing a modified event', async () => {
    const middleware = new Middleware();
    middleware.use((e) => ({ ...e, properties: { ...e.properties, step: 1 } }));
    middleware.use((e) => ({ ...e, name: 'augmented' }));

    const out = await middleware.process({
      name: 'raw',
      timestamp: 0,
      properties: {},
    });

    expect(out.name).toBe('augmented');
    expect(out.properties).toEqual({ step: 1 });
  });

  it('passes the event through unchanged when a hook returns undefined', async () => {
    const middleware = new Middleware();
    middleware.use(() => undefined);
    const event: AnalyticsEvent = { name: 'plain', timestamp: 0, properties: {} };

    const out = await middleware.process(event);
    expect(out).toBe(event);
  });

  it('supports async hooks', async () => {
    const middleware = new Middleware();
    middleware.use(async (e) => {
      await Promise.resolve();
      return { ...e, name: `${e.name}!` };
    });

    const out = await middleware.process({ name: 'hey', timestamp: 0, properties: {} });
    expect(out.name).toBe('hey!');
  });
});

describe('#98/#99 client plugin middleware integration', () => {
  it('registerPlugin() applies beforeSend transforms on flush', async () => {
    const sent: AnalyticsEvent[] = [];
    const client = new AnalyticsClient({}, { send: (e: AnalyticsEvent) => sent.push(e) });

    client.registerPlugin({
      name: 'version-tagger',
      beforeSend: (event) => ({
        ...event,
        properties: { ...event.properties, version: '2.0.0' },
      }),
    });

    client.track('page_view');
    await client.flush();

    expect(sent).toHaveLength(1);
    expect(sent[0]?.name).toBe('page_view');
    expect(sent[0]?.properties).toEqual({ version: '2.0.0' });
  });

  it('runs multiple plugins in registration order', async () => {
    const sent: AnalyticsEvent[] = [];
    const client = new AnalyticsClient({}, { send: (e: AnalyticsEvent) => sent.push(e) });

    client.registerPlugin({
      name: 'first',
      beforeSend: (event) => ({ ...event, properties: { ...event.properties, order: 1 } }),
    });
    client.registerPlugin({
      name: 'second',
      beforeSend: (event) => ({
        ...event,
        properties: { ...event.properties, order: event.properties.order === 1 ? 2 : 0 },
      }),
    });

    client.track('ordering');
    await client.flush();

    expect(sent[0]?.properties).toEqual({ order: 2 });
  });

  it('does not mutate events when no plugin is registered', async () => {
    const sent: AnalyticsEvent[] = [];
    const client = new AnalyticsClient({}, { send: (e: AnalyticsEvent) => sent.push(e) });
    client.track('untouched', { a: 1 });
    await client.flush();
    expect(sent[0]?.properties).toEqual({ a: 1 });
  });
});