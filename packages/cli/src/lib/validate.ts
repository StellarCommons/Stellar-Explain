import { InvalidInputError } from "./errors.js";

export function validateHash(hash: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(hash))
    throw new InvalidInputError(`Invalid transaction hash: ${hash}`);
}

export function validateAddress(address: string): void {
  if (!/^G[A-Z2-7]{55}$/.test(address))
    throw new InvalidInputError(`Invalid Stellar address: ${address}`);
}

export function isValidTransactionHash(hash: unknown): boolean {
  return typeof hash === "string" && /^[0-9a-fA-F]{64}$/.test(hash);
}

export function isValidStellarAddress(address: unknown): boolean {
  return typeof address === "string" && /^G[A-Z2-7]{55}$/.test(address);
}
