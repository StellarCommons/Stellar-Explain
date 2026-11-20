"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TabSwitcher } from "@/components/TabSwitcher";
import AppShell from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { TX_HASH_RE, ACCOUNT_ADDRESS_RE } from "@/lib/validation";

const ERROR_ID = "search-error";

export default function AppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"tx" | "account">("tx");
  const [txInput, setTxInput] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const input = tab === "tx" ? txInput : accountInput;
  const setInput = tab === "tx" ? setTxInput : setAccountInput;

  function handleExplain() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);

    if (tab === "tx") {
      if (!TX_HASH_RE.test(trimmed)) {
        setError("Transaction hash must be 64 hexadecimal characters (0-9, a-f).");
        return;
      }
      startTransition(() => router.push(`/tx/${trimmed}`));
    } else {
      if (!ACCOUNT_ADDRESS_RE.test(trimmed)) {
        setError("Account address must start with G and be 56 characters (A-Z, 2-7).");
        return;
      }
      startTransition(() => router.push(`/account/${trimmed}`));
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
        loading={isPending}
        onChange={(v) => {
          setError(null);
          setInput(v);
        }}
        onSubmit={handleExplain}
        errorId={error ? ERROR_ID : undefined}
      />

      {/* Error */}
      {error && (
        <div
          id={ERROR_ID}
          role="alert"
          className="mb-6 px-4 py-3 rounded-lg text-xs font-mono"
          style={{
            background: "var(--pill-fail-bg)",
            border: "1px solid var(--pill-fail-text)",
            color: "var(--pill-fail-text)",
          }}
        >
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
