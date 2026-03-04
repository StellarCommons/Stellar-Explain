"use client";

import { useState } from "react";
import { fetchTransaction, fetchAccount, getErrorMessage } from "@/lib/api";
import type { TransactionExplanation, AccountExplanation, Tab } from "@/types";
import { TabSwitcher } from "@/components/TabSwitcher";
import { SearchBar } from "@/components/SearchBar";
import { TransactionResult } from "@/components/TransactionResult";
import { AccountResult } from "@/components/AccountResult";

export default function Home() {
  const [tab, setTab] = useState<Tab>("tx");

  // Each tab has its own independent input + result — switching tabs
  // preserves whatever was last searched on each side.
  const [txInput, setTxInput] = useState("");
  const [accountInput, setAccountInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<TransactionExplanation | null>(null);
  const [accountResult, setAccountResult] = useState<AccountExplanation | null>(
    null,
  );

  const input = tab === "tx" ? txInput : accountInput;
  const setInput = tab === "tx" ? setTxInput : setAccountInput;

  async function handleExplain() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      if (tab === "tx") {
        setTxResult(null);
        const data = await fetchTransaction(trimmed);
        setTxResult(data);
      } else {
        setAccountResult(null);
        const data = await fetchAccount(trimmed);
        setAccountResult(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const hasResult = tab === "tx" ? !!txResult : !!accountResult;

  return (
    <div
      className="min-h-screen bg-[#080c12] text-white"
      style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
    >
      {/* grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* horizon glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-16 pb-24">
        {/* header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-lg bg-sky-400/10 border border-sky-400/30 flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-sky-400"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5-2 2m-9 9-2 2m0-13 2 2m9 9 2 2" />
              </svg>
            </div>
            <h1
              className="text-lg font-semibold tracking-tight text-white/90"
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
            >
              Stellar Explain
            </h1>
          </div>
          <p
            className="text-sm text-white/35 leading-relaxed"
            style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
          >
            Plain-English explanations for Stellar blockchain operations.
          </p>
        </div>

        <TabSwitcher active={tab} onChange={setTab} />

        <SearchBar
          tab={tab}
          value={input}
          loading={loading}
          onChange={setInput}
          onSubmit={handleExplain}
        />

        {/* error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* results */}
        {tab === "tx" && txResult && <TransactionResult data={txResult} />}
        {tab === "account" && accountResult && (
          <AccountResult data={accountResult} />
        )}

        {/* empty state */}
        {!hasResult && !error && !loading && (
          <div className="text-center py-20">
            <p className="text-white/15 text-xs font-mono">
              {tab === "tx"
                ? "enter a transaction hash to decode it"
                : "enter an account address to inspect it"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
