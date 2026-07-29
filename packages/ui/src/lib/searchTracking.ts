/** Fires `search.performed` when a user submits a hash or address search. */
export function searchPerformed(inputType: "tx" | "account", query: string): void {
  // eslint-disable-next-line no-console
  console.debug("search.performed", { inputType, query });
}
