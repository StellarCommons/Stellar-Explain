"use client";

import { useState } from "react";
import {
  fetchTransaction,
  fetchAccount,
  getErrorMessage,
  TransactionExplanation,
  AccountExplanation,
} from "@/lib/api";

// ── tiny helpers ──────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── sub-components ────────────────────────────────────────────────────────

function Pill({ label, variant = "default" }: { label: string; variant?: "success" | "fail" | "default" | "warning" }) {
  const cls = {
    success: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
    fail:    "bg-red-900/40 text-red-300 border-red-700/50",
    warning: "bg-amber-900/40 text-amber-300 border-amber-700/50",
    default: "bg-sky-900/40 text-sky-300 border-sky-700/50",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${cls}`}>
      {label}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">{children}</p>;
}

function AddressChip({ addr }: { addr: string }) {
  return (
    <span className="font-mono text-xs bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/60" title={addr}>
      {shortAddr(addr)}
    </span>
  );
}

// ── Transaction result ────────────────────────────────────────────────────

function TransactionResult({ data }: { data: TransactionExplanation }) {
  return (
    <div className="space-y-4 animate-in">

      {/* header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Label>Transaction</Label>
          <p className="font-mono text-xs text-white/40 break-all">{data.transaction_hash}</p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0 mt-4">
          <Pill label={data.successful ? "Confirmed" : "Failed"} variant={data.successful ? "success" : "fail"} />
          {data.skipped_operations > 0 && (
            <Pill label={`${data.skipped_operations} skipped`} variant="warning" />
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
              <p className="text-sm font-mono text-white/70">{data.ledger_closed_at.replace("T", " ").replace("Z", " UTC")}</p>
            </div>
          )}
          {data.ledger && (
            <div>
              <Label>Ledger</Label>
              <p className="text-sm font-mono text-white/70">#{data.ledger.toLocaleString()}</p>
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
              <p className="text-sm text-white/80 leading-relaxed">{p.summary}</p>
              <div className="flex gap-4 flex-wrap pt-1 border-t border-white/6">
                <div>
                  <Label>From</Label>
                  <AddressChip addr={p.from} />
                </div>
                <div>
                  <Label>To</Label>
                  <AddressChip addr={p.to} />
                </div>
                <div>
                  <Label>Amount</Label>
                  <span className="font-mono text-xs text-white/60">{p.amount} {p.asset}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Account result ────────────────────────────────────────────────────────

function AccountResult({ data }: { data: AccountExplanation }) {
  return (
    <div className="space-y-4 animate-in">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Label>Account</Label>
          <p className="font-mono text-xs text-white/40 break-all">{data.address}</p>
        </div>
        {data.org_name && (
          <Pill label={data.org_name} variant="default" />
        )}
      </div>

      <Card>
        <Label>Summary</Label>
        <p className="text-sm text-white/80 leading-relaxed">{data.summary}</p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <Label>XLM Balance</Label>
          <p className="text-lg font-mono text-white/90">{parseFloat(data.xlm_balance).toLocaleString()}</p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">XLM</p>
        </Card>
        <Card>
          <Label>Other Assets</Label>
          <p className="text-lg font-mono text-white/90">{data.asset_count}</p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">trust lines</p>
        </Card>
        <Card>
          <Label>Signers</Label>
          <p className="text-lg font-mono text-white/90">{data.signer_count}</p>
          <p className="text-[10px] text-white/30 font-mono mt-0.5">keys</p>
        </Card>
      </div>

      {data.home_domain && (
        <Card>
          <Label>Home Domain</Label>
          <p className="text-sm font-mono text-white/70">{data.home_domain}</p>
        </Card>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type Tab = "tx" | "account";

export default function Home() {
  const [tab, setTab] = useState<Tab>("tx");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<TransactionExplanation | null>(null);
  const [accountResult, setAccountResult] = useState<AccountExplanation | null>(null);

  const placeholder = tab === "tx"
    ? "Paste a transaction hash…"
    : "Paste a Stellar account address (G…)";

  function switchTab(t: Tab) {
    setTab(t);
    setInput("");
    setError(null);
    setTxResult(null);
    setAccountResult(null);
  }

  async function handleExplain() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setTxResult(null);
    setAccountResult(null);

    try {
      if (tab === "tx") {
        const data = await fetchTransaction(trimmed);
        setTxResult(data);
      } else {
        const data = await fetchAccount(trimmed);
        setAccountResult(data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleExplain();
  }

  const hasResult = txResult || accountResult;

  return (
    <div className="min-h-screen bg-[#080c12] text-white" style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>

      {/* subtle grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      {/* faint horizon glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-16 pb-24">

        {/* header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-lg bg-sky-400/10 border border-sky-400/30 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5-2 2m-9 9-2 2m0-13 2 2m9 9 2 2"/>
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-white/90" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
              Stellar Explain
            </h1>
          </div>
          <p className="text-sm text-white/35 leading-relaxed" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
            Plain-English explanations for Stellar blockchain operations.
          </p>
        </div>

        {/* tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg bg-white/4 border border-white/8 w-fit">
          {(["tx", "account"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-mono transition-all duration-150 ${
                tab === t
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              {t === "tx" ? "Transaction" : "Account"}
            </button>
          ))}
        </div>

        {/* search */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            spellCheck={false}
            className="flex-1 bg-white/4 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono text-white/80 placeholder:text-white/20 outline-none focus:border-sky-500/50 focus:bg-white/5 transition-all"
          />
          <button
            onClick={handleExplain}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-mono hover:bg-sky-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
                loading
              </span>
            ) : "Explain →"}
          </button>
        </div>

        {/* error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* results */}
        {txResult && <TransactionResult data={txResult} />}
        {accountResult && <AccountResult data={accountResult} />}

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