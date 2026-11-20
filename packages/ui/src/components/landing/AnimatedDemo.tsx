"use client";

import { useEffect, useRef, useState } from "react";

// ── Demo data ─────────────────────────────────────────────────────────────

const DEMO_TX_HASH = "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889";
const DEMO_ACCOUNT = "GCCD6AJOYZCUAQLX32ZJF2MKFFAUJ53PVCFQI3RHWKL3V47ONVKA62KST";

const DEMO_TX = {
  hash: "3389e9f0...07c8889",
  summary: "This successful transaction contains 1 payment. GABC…XYZ sent 250.00 USDC to GCJ2…TYBE.",
  confirmedAt: "2026-02-18 08:02:05 UTC",
  ledger: "#61,482,880",
  payment: { from: "GABC…3DE5", to: "GCJ2…HV6J", amount: "250.00 USDC" },
};

const DEMO_ACCT = {
  address: "GCCD6AJO...A62KST",
  summary: "This account holds 9,842.50 XLM and 3 other assets. It has 1 signer.",
  xlm: "9,842.50",
  assets: "3",
  signers: "1",
};

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

type Phase = "idle" | "typing" | "loading" | "result" | "exiting";
type ActiveTab = "tx" | "account";

// ── Card — animates in or out based on prop ───────────────────────────────

function DemoCard({
  children,
  animateOut,
  exitDelay = 0,
}: {
  children: React.ReactNode;
  animateOut: boolean;
  exitDelay?: number;
}) {
  return (
    <div
      style={{
        animation: animateOut
          ? `fadeSlideDown 0.25s ease forwards ${exitDelay}ms`
          : "fadeSlideUp 0.3s ease forwards",
      }}
    >
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AnimatedDemo() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("tx");
  const [tabSliding, setTabSliding] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedText, setTypedText] = useState("");
  const [visibleCards, setVisibleCards] = useState(0);
  const cancelRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // number of cards shown for current tab
  const TX_CARD_COUNT = 4;
  const ACCT_CARD_COUNT = 3;

  useEffect(() => {
    cancelRef.current = false;

    async function runTxDemo() {
      if (cancelRef.current) return;
      setActiveTab("tx");
      setPhase("idle");
      setTypedText("");
      setVisibleCards(0);

      await delay(800);
      if (cancelRef.current) return;

      // type hash
      setPhase("typing");
      for (let i = 1; i <= DEMO_TX_HASH.length; i++) {
        await delay(22);
        if (cancelRef.current) return;
        setTypedText(DEMO_TX_HASH.slice(0, i));
      }

      await delay(350);
      if (cancelRef.current) return;

      setPhase("loading");
      await delay(1200);
      if (cancelRef.current) return;

      // cards animate in top → bottom
      setPhase("result");
      setVisibleCards(0);
      for (let i = 1; i <= TX_CARD_COUNT; i++) {
        await delay(200);
        if (cancelRef.current) return;
        setVisibleCards(i);
      }

      // hold
      await delay(3000);
      if (cancelRef.current) return;

      // cards animate out bottom → top
      setPhase("exiting");
      await delay(TX_CARD_COUNT * 80 + 300);
      if (cancelRef.current) return;

      await runAccountDemo();
    }

    async function runAccountDemo() {
      if (cancelRef.current) return;

      // tab slides
      setTabSliding(true);
      await delay(180);
      if (cancelRef.current) return;
      setActiveTab("account");
      setTabSliding(false);

      setPhase("idle");
      setTypedText("");
      setVisibleCards(0);

      await delay(600);
      if (cancelRef.current) return;

      setPhase("typing");
      for (let i = 1; i <= DEMO_ACCOUNT.length; i++) {
        await delay(20);
        if (cancelRef.current) return;
        setTypedText(DEMO_ACCOUNT.slice(0, i));
      }

      await delay(350);
      if (cancelRef.current) return;

      setPhase("loading");
      await delay(1200);
      if (cancelRef.current) return;

      // cards animate in
      setPhase("result");
      setVisibleCards(0);
      for (let i = 1; i <= ACCT_CARD_COUNT; i++) {
        await delay(200);
        if (cancelRef.current) return;
        setVisibleCards(i);
      }

      // hold
      await delay(3000);
      if (cancelRef.current) return;

      // cards animate out
      setPhase("exiting");
      await delay(ACCT_CARD_COUNT * 80 + 300);
      if (cancelRef.current) return;

      timerRef.current = setTimeout(runTxDemo, 400);
    }

    timerRef.current = setTimeout(runTxDemo, 400);
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isExiting = phase === "exiting";
  const showCards = phase === "result" || phase === "exiting";
  const placeholder =
    activeTab === "tx" ? "Paste a transaction hash…" : "Paste a Stellar address (G…)";

  // exit delay per card index — bottom card exits first (reverse order)
  const txExitDelay = (cardIndex: number) =>
    (TX_CARD_COUNT - cardIndex) * 70;
  const acctExitDelay = (cardIndex: number) =>
    (ACCT_CARD_COUNT - cardIndex) * 70;

  return (
    <>
      {/* keyframes injected once */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(10px); }
        }
      `}</style>

      {/* outer wrapper — hard constrained to its column */}
      <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {/* glow */}
        <div
          style={{
            position: "absolute",
            inset: "-16px",
            borderRadius: "24px",
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(56,189,248,0.07) 0%, transparent 70%)",
          }}
        />

        {/* window — full width of its container, never wider */}
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(10,16,24,0.90)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
            position: "relative",
          }}
        >
          {/* chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(239,68,68,0.5)" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(245,158,11,0.5)" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(16,185,129,0.5)" }} />
            <span style={{ marginLeft: 8, fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
              stellar-explain.app
            </span>
          </div>

          {/* body */}
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box", width: "100%" }}>

            {/* tabs */}
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", width: "fit-content" }}>
              {(["tx", "account"] as ActiveTab[]).map((t) => {
                const isActive = activeTab === t;
                return (
                  <div
                    key={t}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: "monospace",
                      transition: "all 0.3s",
                      background: isActive
                        ? tabSliding ? "rgba(14,165,233,0.08)" : "rgba(14,165,233,0.20)"
                        : "transparent",
                      color: isActive
                        ? tabSliding ? "rgba(125,211,252,0.5)" : "rgb(125,211,252)"
                        : "rgba(255,255,255,0.30)",
                      border: isActive
                        ? tabSliding ? "1px solid rgba(14,165,233,0.15)" : "1px solid rgba(14,165,233,0.30)"
                        : "1px solid transparent",
                      transform: isActive && tabSliding ? "scale(0.95)" : "scale(1)",
                    }}
                  >
                    {t === "tx" ? "Transaction" : "Account"}
                  </div>
                );
              })}
            </div>

            {/* input row — input shrinks, button is rigid */}
            <div style={{ display: "flex", gap: 8, width: "100%", boxSizing: "border-box" }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,           // critical — allows flex child to shrink below content size
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  minHeight: 38,
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",    // clips the hash
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: phase === "idle" ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.70)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                    width: "100%",
                  }}
                >
                  {phase === "idle" ? placeholder : typedText}
                  {phase === "typing" && (
                    <span style={{ display: "inline-block", width: 2, height: 12, background: "rgb(56,189,248)", marginLeft: 2, animation: "pulse 1s infinite" }} />
                  )}
                </span>
              </div>

              {/* button — never shrinks */}
              <div
                style={{
                  width: 72,
                  flexShrink: 0,         // never shrinks
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: (phase === "loading" || phase === "result" || phase === "exiting")
                    ? "1px solid rgba(14,165,233,0.30)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: (phase === "loading" || phase === "result" || phase === "exiting")
                    ? "rgba(14,165,233,0.20)"
                    : "rgba(255,255,255,0.04)",
                  color: (phase === "loading" || phase === "result" || phase === "exiting")
                    ? "rgb(125,211,252)"
                    : "rgba(255,255,255,0.20)",
                  fontSize: 11,
                  fontFamily: "monospace",
                  transition: "all 0.3s",
                  boxSizing: "border-box",
                }}
              >
                {phase === "loading" ? (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      border: "2px solid rgba(56,189,248,0.3)",
                      borderTopColor: "rgb(56,189,248)",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                ) : (
                  "Explain →"
                )}
              </div>
            </div>

            {/* results */}
            {showCards && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", boxSizing: "border-box", overflow: "hidden" }}>

                {/* ── TX cards ── */}
                {activeTab === "tx" && (
                  <>
                    {visibleCards >= 1 && (
                      <DemoCard animateOut={isExiting} exitDelay={txExitDelay(1)}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {DEMO_TX.hash}
                          </span>
                          <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontFamily: "monospace", background: "rgba(6,78,59,0.4)", color: "rgb(110,231,183)", border: "1px solid rgba(16,185,129,0.3)" }}>
                            Confirmed
                          </span>
                        </div>
                      </DemoCard>
                    )}

                    {visibleCards >= 2 && (
                      <DemoCard animateOut={isExiting} exitDelay={txExitDelay(2)}>
                        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>Summary</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>{DEMO_TX.summary}</p>
                        </div>
                      </DemoCard>
                    )}

                    {visibleCards >= 3 && (
                      <DemoCard animateOut={isExiting} exitDelay={txExitDelay(3)}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                            <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>Confirmed at</p>
                            <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.60)" }}>{DEMO_TX.confirmedAt}</p>
                          </div>
                          <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                            <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>Ledger</p>
                            <p style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.60)" }}>{DEMO_TX.ledger}</p>
                          </div>
                        </div>
                      </DemoCard>
                    )}

                    {visibleCards >= 4 && (
                      <DemoCard animateOut={isExiting} exitDelay={txExitDelay(4)}>
                        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>Payment</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 10, fontFamily: "monospace" }}>
                            <div>
                              <p style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>From</p>
                              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, padding: "2px 6px", color: "rgba(255,255,255,0.50)" }}>{DEMO_TX.payment.from}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>To</p>
                              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 4, padding: "2px 6px", color: "rgba(255,255,255,0.50)" }}>{DEMO_TX.payment.to}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Amount</p>
                              <span style={{ color: "rgba(255,255,255,0.60)" }}>{DEMO_TX.payment.amount}</span>
                            </div>
                          </div>
                        </div>
                      </DemoCard>
                    )}
                  </>
                )}

                {/* ── Account cards ── */}
                {activeTab === "account" && (
                  <>
                    {visibleCards >= 1 && (
                      <DemoCard animateOut={isExiting} exitDelay={acctExitDelay(1)}>
                        <div>
                          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 2 }}>Account</p>
                          <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.40)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{DEMO_ACCT.address}</p>
                        </div>
                      </DemoCard>
                    )}

                    {visibleCards >= 2 && (
                      <DemoCard animateOut={isExiting} exitDelay={acctExitDelay(2)}>
                        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>Summary</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>{DEMO_ACCT.summary}</p>
                        </div>
                      </DemoCard>
                    )}

                    {visibleCards >= 3 && (
                      <DemoCard animateOut={isExiting} exitDelay={acctExitDelay(3)}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                          {[
                            { label: "XLM", value: DEMO_ACCT.xlm },
                            { label: "Assets", value: DEMO_ACCT.assets },
                            { label: "Signers", value: DEMO_ACCT.signers },
                          ].map((item) => (
                            <div key={item.label} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                              <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{item.label}</p>
                              <p style={{ fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.80)" }}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </DemoCard>
                    )}
                  </>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}