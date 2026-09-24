import { describe, expect, it } from 'vitest';
import { AnalyticsClient } from '../src/index.js';

describe('#89 track() PII scrubbing', () => {
  it('scrubs emails and long numbers from properties by default', () => {
    const client = new AnalyticsClient({}, { send: () => undefined });
    client.track('signup', { email: 'user@example.com', phone: '160455512341234' });

    const [event] = client.getQueue().drain();
    expect(event?.properties).toEqual({
      email: '[email]',
      phone: '[long-number]',
    });
  });

  it('scrubs nested property values', () => {
    const client = new AnalyticsClient({}, { send: () => undefined });
    client.track('checkout', {
      user: { email: 'a@b.io', plan: 'pro' },
      tags: ['x@y.co'],
    });

    const [event] = client.getQueue().drain();
    expect(event?.properties).toEqual({
      user: { email: '[email]', plan: 'pro' },
      tags: ['[email]'],
    });
  });

  it('leaves non-PII values untouched', () => {
    const client = new AnalyticsClient({}, { send: () => undefined });
    client.track('click', { label: 'submit', count: 3, ratio: 0.5 });

    const [event] = client.getQueue().drain();
    expect(event?.properties).toEqual({ label: 'submit', count: 3, ratio: 0.5 });
  });

  it('does not scrub when config.scrubPii is disabled', () => {
    const client = new AnalyticsClient({ scrubPii: false }, { send: () => undefined });
    client.track('raw', { email: 'user@example.com' });

    const [event] = client.getQueue().drain();
    expect(event?.properties).toEqual({ email: 'user@example.com' });
  });
});