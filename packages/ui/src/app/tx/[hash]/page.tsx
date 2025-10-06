'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Loader2 } from 'lucide-react';

interface Operation {
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  asset?: string;
}

interface Transaction {
  hash: string;
  source_account: string;
  memo?: string;
  fee_charged: string;
  created_at: string;
  signatures: string[];
  operations: Operation[];
}

export default function TransactionDetailsPage() {
  const { hash } = useParams();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hash) return;
    const fetchTx = async () => {
      try {
        const res = await fetch(`/api/tx/${hash}`);
        const data = await res.json();
        setTx(data);
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, [hash]);

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );

  if (!tx)
    return (
      <div className="text-center mt-10 text-gray-500">
        Transaction not found.
      </div>
    );

  const copyHash = () => {
    navigator.clipboard.writeText(tx.hash);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-md border border-gray-100">
      <h1 className="text-2xl font-semibold text-purple-600 mb-3">
        Transaction Details
      </h1>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Hash:</span>
          <div className="flex items-center gap-2">
            <code className="text-sm text-gray-600 break-all">{tx.hash}</code>
            <button
              onClick={copyHash}
              className="text-purple-500 hover:text-purple-700 transition"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
        <p>
          <span className="font-medium text-gray-700">Source Account:</span>{' '}
          {tx.source_account}
        </p>
        <p>
          <span className="font-medium text-gray-700">Memo:</span>{' '}
          {tx.memo || '—'}
        </p>
        <p>
          <span className="font-medium text-gray-700">Fee:</span>{' '}
          {tx.fee_charged} stroops
        </p>
        <p>
          <span className="font-medium text-gray-700">Created:</span>{' '}
          {formatDate(tx.created_at)}
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-purple-600 mb-2">
          Signatures
        </h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {tx.signatures.map((sig, idx) => (
            <li
              key={idx}
              className="bg-gray-50 p-2 rounded-md border border-gray-100"
            >
              {sig}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-purple-600 mb-2">
          Operations
        </h2>
        <div className="space-y-3">
          {tx.operations.map((op, idx) => (
            <div
              key={idx}
              className="border border-gray-100 rounded-lg p-3 bg-gray-50"
            >
              <p className="text-sm">
                <span className="font-medium text-gray-700">Type:</span>{' '}
                {op.type}
              </p>
              {op.from && (
                <p className="text-sm">
                  <span className="font-medium text-gray-700">From:</span>{' '}
                  {op.from}
                </p>
              )}
              {op.to && (
                <p className="text-sm">
                  <span className="font-medium text-gray-700">To:</span> {op.to}
                </p>
              )}
              {op.amount && (
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Amount:</span>{' '}
                  {op.amount} {op.asset || ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
