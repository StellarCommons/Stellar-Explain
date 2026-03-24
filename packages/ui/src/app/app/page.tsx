"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TabSwitcher } from "@/components/TabSwitcher";
import AppShell from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";

export default function AppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"tx" | "account">("tx");
  const [txInput, setTxInput] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const input = tab === "tx" ? txInput : accountInput;
  const setInput = tab === "tx" ? setTxInput : setAccountInput;

  function handleExplain() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);

    if (tab === "tx") {
      if (trimmed.length !== 64) {
        setError("Transaction hash must be 64 characters.");
        return;
      }
      router.push(`/tx/${trimmed}`);
    } else {
      if (!trimmed.startsWith("G") || trimmed.length !== 56) {
        setError("Please enter a valid Stellar account address.");
        return;
      }
      router.push(`/account/${trimmed}`);
    }
  }

  return (
    <AppShell>
      {/* Hero block */}
      <div className="mb-10 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <p
            className="text-sm text-white/35 leading-relaxed"
            style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
          >
            Plain-English explanations for Stellar blockchain operations.
            Paste any transaction hash or account address below.
          </p>
        </div>
      </div>

      <TabSwitcher active={tab} onChange={setTab} />

      <SearchBar
        tab={tab}
        value={input}
        loading={false}
        onChange={setInput}
        onSubmit={handleExplain}
      />

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && (
        <div className="text-center py-20">
          <p className="text-white/15 text-xs font-mono">
            {tab === "tx"
              ? "enter a transaction hash to decode it"
              : "enter an account address to inspect it"}
          </p>
        </div>
      )}
    </AppShell>
  );
}