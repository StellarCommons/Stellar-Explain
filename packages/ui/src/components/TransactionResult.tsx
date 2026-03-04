import type { TransactionExplanation } from "@/types";
import { Card } from "@/components/Card";
import { Label } from "@/components/Label";
import { Pill } from "@/components/Pill";
import { AddressChip } from "@/components/AddressChip";
import { formatLedgerTime } from "@/lib/utils";

interface TransactionResultProps {
  data: TransactionExplanation;
}

export function TransactionResult({ data }: TransactionResultProps) {
  return (
    <div className="space-y-4 animate-in">

      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Label>Transaction</Label>
          <p className="font-mono text-xs text-white/40 break-all leading-relaxed">
            {data.transaction_hash}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0 mt-4">
          <Pill
            label={data.successful ? "Confirmed" : "Failed"}
            variant={data.successful ? "success" : "fail"}
          />
          {data.skipped_operations > 0 && (
            <Pill
              label={`${data.skipped_operations} skipped`}
              variant="warning"
            />
          )}
        </div>
      </div>

      {/* summary */}
      <Card>
        <Label>Summary</Label>
        <p className="text-sm text-white/80 leading-relaxed">{data.summary}</p>
      </Card>

      {/* timeline */}
      {(data.ledger_closed_at || data.ledger) && (
        <Card className="flex gap-6 flex-wrap">
          {data.ledger_closed_at && (
            <div>
              <Label>Confirmed at</Label>
              <p className="text-sm font-mono text-white/70">
                {formatLedgerTime(data.ledger_closed_at)}
              </p>
            </div>
          )}
          {data.ledger && (
            <div>
              <Label>Ledger</Label>
              <p className="text-sm font-mono text-white/70">
                #{data.ledger.toLocaleString()}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* memo */}
      {data.memo_explanation && (
        <Card>
          <Label>Memo</Label>
          <p className="text-sm text-white/70">{data.memo_explanation}</p>
        </Card>
      )}

      {/* fee */}
      {data.fee_explanation && (
        <Card>
          <Label>Fee</Label>
          <p className="text-sm text-white/70">{data.fee_explanation}</p>
        </Card>
      )}

      {/* payments */}
      {data.payment_explanations.length > 0 && (
        <div className="space-y-3">
          <Label>Payments ({data.payment_explanations.length})</Label>
          {data.payment_explanations.map((p, i) => (
            <Card key={i} className="space-y-3">
              <p className="text-sm text-white/80 leading-relaxed break-words">{p.summary}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-3 pt-1 border-t border-white/6">
                <div className="min-w-0">
                  <Label>From</Label>
                  <AddressChip addr={p.from} />
                </div>
                <div className="min-w-0">
                  <Label>To</Label>
                  <AddressChip addr={p.to} />
                </div>
                <div className="min-w-0 w-full sm:w-auto">
                  <Label>Amount</Label>
                  <span className="font-mono text-xs text-white/60 break-all">
                    {p.amount}{" "}
                    <span className="text-white/40">{p.asset}</span>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}