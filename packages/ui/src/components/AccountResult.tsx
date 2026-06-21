import type { AccountExplanation } from "@/types";
import { Card } from "@/components/Card";
import { Label } from "@/components/Label";
import { Pill } from "@/components/Pill";
import { formatBalance } from "@/lib/utils";

interface AccountResultProps {
  data: AccountExplanation;
  isSaved: boolean;
  savedLabel?: string;
  onSave: (label: string, address: string) => boolean;
  onRemoveSaved: () => void;
}

export function AccountResult({ data }: AccountResultProps) {
  return (
    <div className="space-y-4 animate-in">

      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Label>Account</Label>
          <p
            className="font-mono text-xs break-all"
            style={{ color: "var(--text-mono)" }}
          >
            {data.address}
          </p>
        </div>
      </div>

      {/* summary */}
      <Card>
        <Label>Summary</Label>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </p>
      </Card>

      {/* stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <Label>XLM Balance</Label>
          <p className="text-lg font-mono" style={{ color: "var(--text-primary)" }}>
            {formatBalance(data.xlm_balance)}
          </p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>XLM</p>
        </Card>
        <Card>
          <Label>Other Assets</Label>
          <p className="text-lg font-mono" style={{ color: "var(--text-primary)" }}>
            {data.asset_count}
          </p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>trust lines</p>
        </Card>
        <Card>
          <Label>Signers</Label>
          <p className="text-lg font-mono" style={{ color: "var(--text-primary)" }}>
            {data.signer_count}
          </p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>keys</p>
        </Card>
      </div>

      {/* home domain */}
      {data.home_domain && (
        <Card>
          <Label>Home Domain</Label>
          <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
            {data.home_domain}
          </p>
        </Card>
      )}

      {/* flags */}
      {data.flag_descriptions.length > 0 && (
        <Card>
          <Label>Account Flags</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {data.flag_descriptions.map((flag, i) => (
              <Pill key={i} label={flag} variant="warning" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
