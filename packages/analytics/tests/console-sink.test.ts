import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleSink } from '../src/sinks/ConsoleSink.js';
import type { AnalyticsEvent } from '../src/types.js';

const sampleEvent: AnalyticsEvent = {
  name: 'page_view',
  timestamp: 1_700_000_000_000,
  properties: { url: '/test' },
};

describe('ConsoleSink — #1074', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls console.info when send() is called', () => {
    const sink = new ConsoleSink(true);
    sink.send(sampleEvent);
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('includes the event in the console.info call', () => {
    const sink = new ConsoleSink(true);
    sink.send(sampleEvent);
    const args = infoSpy.mock.calls[0];
    // Logger prefixes with "[analytics]" and the message "analytics event"
    expect(args).toContain('analytics event');
    expect(args).toContainEqual(expect.objectContaining({ name: 'page_view' }));
  });

  it('implements the Emitter interface (send returns void)', () => {
    const sink = new ConsoleSink(true);
    const result = sink.send(sampleEvent);
    expect(result).toBeUndefined();
  });

  it('does NOT log when debug=false', () => {
    const sink = new ConsoleSink(false);
    sink.send(sampleEvent);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('debug defaults to true — logs without explicit arg', () => {
    const sink = new ConsoleSink();
    sink.send(sampleEvent);
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('can be used as an Emitter with AnalyticsClient', async () => {
    const { AnalyticsClient } = await import('../src/client.js');
    const sink = new ConsoleSink(true);
    const client = new AnalyticsClient({}, sink);
    client.track('sink_test', { x: 1 });
    await client.flush();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });
});
