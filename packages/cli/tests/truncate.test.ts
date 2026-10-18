import { describe, it, expect } from 'vitest';
import { truncateAddress } from '../src/utils/truncate';

describe('truncateAddress', () => {
  it('truncates full-length addresses to first 6 + last 6 characters', () => {
    const addr = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    expect(truncateAddress(addr)).toBe('GAAZI4…KOCCWN7'.replace('KOCCWN7', addr.slice(-6)));
  });

  it('returns short strings unchanged', () => {
    expect(truncateAddress('GABC')).toBe('GABC');
  });
});
