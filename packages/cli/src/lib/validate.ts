import { InvalidInputError } from "./errors.js";

export function validateHash(hash: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(hash))
    throw new InvalidInputError(`Invalid transaction hash: ${hash}`);
}

export function validateAddress(address: string): void {
  if (!/^G[A-Z2-7]{55}$/.test(address))
    throw new InvalidInputError(`Invalid Stellar address: ${address}`);
}
