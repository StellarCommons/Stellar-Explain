import {
  isValidStellarAddress,
  isValidTransactionHash,
} from '../../src/lib/validate';

describe('validate helpers', () => {
  describe('isValidTransactionHash', () => {
    it('returns true for valid transaction hash', () => {
      const hash =
        'a3f5c2b9d8e1f4a6b7c8d9e0f123456789abcdef123456789abcdef12345678';

      expect(isValidTransactionHash(hash)).toBe(true);
    });

    it('returns false for empty hash', () => {
      expect(isValidTransactionHash('')).toBe(false);
    });

    it('returns false for short hash', () => {
      expect(
        isValidTransactionHash('abc123'),
      ).toBe(false);
    });

    it('returns false for invalid characters', () => {
      const invalidHash =
        'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

      expect(
        isValidTransactionHash(invalidHash),
      ).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(
        isValidTransactionHash(null as any),
      ).toBe(false);

      expect(
        isValidTransactionHash(undefined as any),
      ).toBe(false);
    });
  });

  describe('isValidStellarAddress', () => {
    it('returns true for valid Stellar address', () => {
      const address =
        'GBRPYHIL2CI3ZJ3N6PFV6XQ5U6JYQ4KZ6Y5HZK4A6X5Q5JXJQX7P6F5S';

      expect(isValidStellarAddress(address)).toBe(
        true,
      );
    });

    it('returns false for empty address', () => {
      expect(isValidStellarAddress('')).toBe(
        false,
      );
    });

    it('returns false for malformed address', () => {
      expect(
        isValidStellarAddress('INVALID_ADDRESS'),
      ).toBe(false);
    });

    it('returns false for short address', () => {
      expect(
        isValidStellarAddress('GB123'),
      ).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(
        isValidStellarAddress(null as any),
      ).toBe(false);

      expect(
        isValidStellarAddress(undefined as any),
      ).toBe(false);
    });
  });
});
