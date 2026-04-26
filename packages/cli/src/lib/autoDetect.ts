export type InputType = "hash" | "address" | "unknown";

export function detectInputType(input: string): InputType {
  if (/^[0-9a-fA-F]{64}$/.test(input)) return "hash";
  if (/^G[A-Z2-7]{55}$/.test(input)) return "address";
  return "unknown";
}