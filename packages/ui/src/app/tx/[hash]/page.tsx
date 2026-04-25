"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchTransaction } from "@/lib/api";
import type { TransactionExplanation } from "@/types";
import { TransactionResult } from "@/components/TransactionResult";
import ErrorDisplay from "@/components/ErrorDisplay";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/AppShellContext";

function TxPageInner() {
  const { hash } = useParams<{ hash: string }>();
  const router = useRouter();
  const { addEntry } = useAppShell();

  const [data, setData] = useState<TransactionExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!hash) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTransaction(hash);
      setData(result);
      addEntry("transaction", hash, result.summary);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [hash, addEntry]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ paddingTop: "24px" }}>
      {/* Back button */}
      <button
        onClick={() => router.push("/app")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: "12px",
          padding: "0 0 20px",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to search
      </button>

      {loading && <TransactionSkeleton />}

      {error && !loading && (
        <ErrorDisplay error={error} identifier={hash} onRetry={load} />
      )}

      {data && !loading && (
        <TransactionResult data={data} />
      )}
    </div>
  );
}

export default function TxPage() {
  return (
    <AppShell>
      <TxPageInner />
    </AppShell>
  );
}

function TransactionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div style={{ height: "16px", width: "120px", borderRadius: "6px", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ height: "60px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ height: "80px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ height: "72px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ height: "72px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }} />
      </div>
    </div>
  );
}