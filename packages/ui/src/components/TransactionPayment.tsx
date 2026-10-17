// Fix: render From/To values in TransactionResult payment operations (#1312)
import React from 'react';
interface PaymentOperation {
  from?: string;
  to?: string;
  amount?: string;
  asset?: string;
}
export function TransactionPayment({ op }: { op: PaymentOperation }) {
  return (
    <div className="rounded border p-3 text-sm">
      <div><span className="font-medium">From:</span> {op.from ?? 'N/A'}</div>
      <div><span className="font-medium">To:</span> {op.to ?? 'N/A'}</div>
      <div><span className="font-medium">Amount:</span> {op.amount ?? '0'} {op.asset ?? 'XLM'}</div>
    </div>
  );
}
