import { emit } from "@/lib/analytics";

/** Fires `tx.not_found` or `account.not_found` when a lookup returns 404. */
export function trackNotFound(kind: "tx" | "account", identifier: string): void {
  emit(kind === "tx" ? "tx.not_found" : "account.not_found", { identifier });
}
