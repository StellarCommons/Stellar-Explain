import { emit } from "@/lib/analytics";

/** Fires `search.performed`. Only the query length is sent, never the raw hash/address. */
export function searchPerformed(inputType: "tx" | "account", query: string): void {
  emit("search.performed", { inputType, queryLength: query.length });
}
