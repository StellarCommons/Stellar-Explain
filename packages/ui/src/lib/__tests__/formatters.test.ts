// Fix: add unit tests for formatBalance, shortAddr, formatLedgerTime (#1309)
import { formatBalance, shortAddr, formatLedgerTime } from '../formatters';
describe('formatBalance', () => {
  it('formats stroops to XLM', () => {
    expect(formatBalance('10000000')).toBe('1.0000000 XLM');
  });
  it('returns 0 XLM for falsy input', () => {
    expect(formatBalance('')).toBe('0 XLM');
  });
});
describe('shortAddr', () => {
  it('truncates long addresses', () => {
    const addr = 'GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ';
    expect(shortAddr(addr)).toBe('GABCD...WXYZ');
  });
  it('returns short addresses as-is', () => {
    expect(shortAddr('GABC')).toBe('GABC');
  });
});
describe('formatLedgerTime', () => {
  it('formats an ISO date string', () => {
    const result = formatLedgerTime('2024-01-15T12:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
