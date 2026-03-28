'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAccount } from '@/lib/api';
import type { AccountExplanation } from '@/types';
import { AccountResult } from '@/components/AccountResult';
import ErrorDisplay from '@/components/ErrorDisplay';
import AppShell from '@/components/AppShell';
import { useAppShell } from '@/components/AppShellContext';

function AccountPageInner() {
  const { address } = useParams<{ address: string }>();
  const router = useRouter();
  const { addEntry, isSaved, getEntry, saveAddress, removeAddress } = useAppShell();

  const [data, setData] = useState<AccountExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAccount(address);
      setData(result);
      addEntry('account', address, result.summary);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [address, addEntry]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ paddingTop: '24px' }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/app')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: '12px',
          padding: '0 0 20px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M8 2L4 6l4 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to search
      </button>

      {loading && <AccountSkeleton />}

      {error && !loading && <ErrorDisplay error={error} identifier={address} onRetry={load} />}

      {data && !loading && (
        <AccountResult
          data={data}
          isSaved={isSaved(address)}
          savedLabel={getEntry(address)?.label}
          onSave={saveAddress}
          onRemoveSaved={() => {
            const entry = getEntry(address);
            if (entry) removeAddress(entry.id);
          }}
        />
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <AppShell>
      <AccountPageInner />
    </AppShell>
  );
}

function AccountSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div
        style={{
          height: '16px',
          width: '100px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
      <div style={{ height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div
          style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}
        />
        <div
          style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}
        />
        <div
          style={{ height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}
        />
      </div>
      <div style={{ height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}
