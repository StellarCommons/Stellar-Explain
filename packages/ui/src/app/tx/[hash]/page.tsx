"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchTransaction, getErrorMessage } from "@/lib/api";
import type { TransactionExplanation } from "@/types";
import { TransactionResult } from "@/components/TransactionResult";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/AppShellContext";

// ── Inner page — consumes context ──────────────────────────────────────────

function TxPageInner() {
  const { hash } = useParams<{ hash: string }>();
  const router = useRouter();
  const { addEntry } = useAppShell();

  const [data, setData] = useState<TransactionExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTransaction(hash);
        if (!cancelled) {
          setData(result);
          addEntry("transaction", hash, result.summary);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hash, addEntry]);

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
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(255,255,255,0.7)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(255,255,255,0.3)";
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

      {/* {loading && <TransactionSkeleton />} */}
      {loading && (
        <p className="text-white/30 text-xs font-mono pt-8">Loading...</p>
      )}

      {error && !loading && (
        <div className="px-4 py-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-mono">
          {error}
        </div>
      )}

      {data && !loading && <TransactionResult data={data} />}
    </div>
  );
}

// ── Page — wraps with AppShell ─────────────────────────────────────────────

export default function TxPage() {
  return (
    <AppShell>
      <TxPageInner />
    </AppShell>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

// function TransactionSkeleton() {
//   return (
//     <div className="space-y-4 animate-pulse">
//       <div
//         style={{
//           height: "16px",
//           width: "120px",
//           borderRadius: "6px",
//           background: "rgba(255,255,255,0.06)",
//         }}
//       />
//       <div
//         style={{
//           height: "60px",
//           borderRadius: "12px",
//           background: "rgba(255,255,255,0.04)",
//         }}
//       />
//       <div
//         style={{
//           height: "80px",
//           borderRadius: "12px",
//           background: "rgba(255,255,255,0.04)",
//         }}
//       />
//       <div
//         style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
//       >
//         <div
//           style={{
//             height: "72px",
//             borderRadius: "12px",
//             background: "rgba(255,255,255,0.04)",
//           }}
//         />
//         <div
//           style={{
//             height: "72px",
//             borderRadius: "12px",
//             background: "rgba(255,255,255,0.04)",
//           }}
//         />
//       </div>
//     </div>
//   );
// }
