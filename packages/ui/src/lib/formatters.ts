// Display helpers. `xlm_balance` from the backend is already an XLM string (not stroops).

/** Balance to show next to an "XLM" label; empty input becomes "0". */
export function formatBalance(balance: string | null | undefined): string {
  return balance ? balance : "0";
}

/** Shortens long addresses to `GABCD...WXYZ`; short values are returned as-is. */
export function shortAddr(addr: string): string {
  return addr.length <= 12 ? addr : `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

/** Formats an ISO ledger close time as a readable UTC date/time. */
export function formatLedgerTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}
