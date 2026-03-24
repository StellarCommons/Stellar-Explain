import { shortAddr } from "../lib/utils";

interface AddressChipProps {
  addr: string;
}

export function AddressChip({ addr }: AddressChipProps) {
  return (
    <span
      className="font-mono text-xs bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/60"
      title={addr}
    >
      {shortAddr(addr)}
    </span>
  );
}
