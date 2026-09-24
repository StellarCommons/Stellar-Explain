import { describe, expect, it } from 'vitest';
import {
  scrubEventProperties,
  scrubPii,
  scrubPiiString,
} from '../src/lib/scrubPii.js';

describe('scrubPiiString', () => {
  it('scrubs email addresses', () => {
    expect(scrubPiiString('contact john.doe@example.com now')).toBe('contact [email] now');
  });

  it('strips multiple emails in one string', () => {
    expect(scrubPiiString('a@b.com and c.d@co.uk')).toBe('[email] and [email]');
  });

  it('scrubs long numeric strings (>= 12 digits)', () => {
    expect(scrubPiiString('card 4242424242424242 ok')).toBe('card [long-number] ok');
  });

  it('leaves short numbers alone', () => {
    expect(scrubPiiString('qty 42')).toBe('qty 42');
  });
});

describe('scrubPii', () => {
  it('handles nested objects and arrays recursively', () => {
    const input = {
      user: { email: 'jane@x.io', score: 7, tags: ['a@b.com', '160455512341234'] },
    };
    expect(scrubPii(input)).toEqual({
      user: { email: '[email]', score: 7, tags: ['[email]', '[long-number]'] },
    });
  });

  it('preserves non-string primitives', () => {
    expect(scrubPii(42)).toBe(42);
    expect(scrubPii(true)).toBe(true);
    expect(scrubPii(null)).toBe(null);
    expect(scrubPii(undefined)).toBe(undefined);
  });
});

describe('scrubEventProperties', () => {
  it('scrubs every value inside the properties object', () => {
    const props = {
      email: 'a@b.com',
      nested: { phone: '160455512341234' },
      ok: 1,
    };
    expect(scrubEventProperties(props)).toEqual({
      email: '[email]',
      nested: { phone: '[long-number]' },
      ok: 1,
    });
  });

  it('does not mutate the input', () => {
    const props = { email: 'a@b.com' };
    scrubEventProperties(props);
    expect(props.email).toBe('a@b.com');
  });
});