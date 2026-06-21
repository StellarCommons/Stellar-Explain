import { shortAddr } from "../lib/utils";

interface AddressChipProps {
  addr: string;
}

export function AddressChip({ addr }: AddressChipProps) {
  return (
    <span
      className="font-mono text-xs rounded px-2 py-0.5"
      style={{
        background: "var(--bg-card-hover)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-mono)",
      }}
      title={addr}
    >
      {shortAddr(addr)}
    </span>
  );
}
