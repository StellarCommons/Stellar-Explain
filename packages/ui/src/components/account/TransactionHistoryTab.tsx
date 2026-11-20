'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAccountHistory } from '@/lib/api';
import type { AccountHistoryTransaction } from '@/types';
import { Card } from '@/components/Card';
import { Label } from '@/components/Label';

interface TransactionHistoryTabProps {
  address: string;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-white/8" />
        <div className="h-2.5 w-1/3 rounded bg-white/5" />
      </div>
      <div className="h-5 w-10 rounded bg-white/6" />
    </div>
  );
}

function TxRow({ tx }: { tx: AccountHistoryTransaction }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/tx/${tx.transaction_hash}`)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/4 transition-colors duration-100 border-b border-white/6 last:border-0"
    >
      {/* status dot */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${tx.successful ? 'bg-emerald-400' : 'bg-red-400'}`}
        aria-label={tx.successful ? 'successful' : 'failed'}
      />

      {/* summary */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate leading-snug">{tx.summary}</p>
        <p className="text-[11px] font-mono text-white/30 mt-0.5">
          {relativeTime(tx.ledger_closed_at)}
        </p>
      </div>

      {/* op count badge */}
      <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono text-white/40 border border-white/10 bg-white/4">
        {tx.operation_count} op{tx.operation_count !== 1 ? 's' : ''}
      </span>

      {/* chevron */}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-white/20">
        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function TransactionHistoryTab({ address }: TransactionHistoryTabProps) {
  const [transactions, setTransactions] = useState<AccountHistoryTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAccountHistory(address);
      setTransactions(result.transactions);
      setNextCursor(result.next_cursor);
      setHasMore(result.has_more);
    } catch {
      setError('Failed to load transaction history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchAccountHistory(address, 10, nextCursor);
      setTransactions((prev) => [...prev, ...result.transactions]);
      setNextCursor(result.next_cursor);
      setHasMore(result.has_more);
    } catch {
      setError('Failed to load more transactions.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card className="overflow-hidden p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={load}
          className="mt-3 text-xs font-mono text-sky-400 hover:text-sky-300 transition-colors"
        >
          Retry
        </button>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <Label>No transactions</Label>
        <p className="text-sm text-white/40 mt-1">This account has no recorded transactions.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden p-0">
        {transactions.map((tx) => (
          <TxRow key={tx.transaction_hash} tx={tx} />
        ))}
      </Card>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 text-xs font-mono text-sky-400 hover:text-sky-300 disabled:text-white/20 transition-colors"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
