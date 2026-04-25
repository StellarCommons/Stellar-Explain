import type { AccountExplanation } from "@/types";
import { Card } from "@/components/Card";
import { Label } from "@/components/Label";
import { Pill } from "@/components/Pill";
import { formatBalance } from "@/lib/utils";
// import SaveAddressButton from "@/components/addressbook/SaveAddressButton";
// import QRShareButton from "@/components/QRShareButton";
// import { useAppShell } from "@/components/AppShellContext";

interface AccountResultProps {
  data: AccountExplanation;
  isSaved: boolean;
  savedLabel?: string;
  onSave: (label: string, address: string) => boolean;
  onRemoveSaved: () => void;
}

export function AccountResult({ data, isSaved, savedLabel, onSave, onRemoveSaved }: AccountResultProps) {
//   const { personalise } = useAppShell();
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/account/${data.address}`
    : "";

  return (
    <div className="space-y-4 animate-in">

      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Label>Account</Label>
          <p className="font-mono text-xs text-white/40 break-all">
            {data.address}
          </p>
        </div>
        {/* <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {data.org_name && (
            <Pill label={data.org_name} variant="default" />
          )}
          <SaveAddressButton
            address={data.address}
            isSaved={isSaved}
            savedLabel={savedLabel}
            onSave={onSave}
            onRemove={onRemoveSaved}
          />
          <QRShareButton
            url={shareUrl}
            label={`Account ${data.address.slice(0, 8)}…`}
          />
        </div> */}
      </div>

      {/* summary */}
      <Card>
        <Label>Summary</Label>
        <p className="text-sm text-white/80 leading-relaxed">{data.summary}</p>
      </Card>

      {/* stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <Label>XLM Balance</Label>
          <p className="text-lg font-mono text-white/90">
            {formatBalance(data.xlm_balance)}
          </p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">XLM</p>
        </Card>
        <Card>
          <Label>Other Assets</Label>
          <p className="text-lg font-mono text-white/90">{data.asset_count}</p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">trust lines</p>
        </Card>
        <Card>
          <Label>Signers</Label>
          <p className="text-lg font-mono text-white/90">{data.signer_count}</p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">keys</p>
        </Card>
      </div>

      {/* home domain */}
      {data.home_domain && (
        <Card>
          <Label>Home Domain</Label>
          <p className="text-sm font-mono text-white/70">{data.home_domain}</p>
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