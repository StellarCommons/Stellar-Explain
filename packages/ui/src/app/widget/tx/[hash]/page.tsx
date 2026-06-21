import { fetchTransaction } from "@/lib/api";
import { isApiError } from "@/lib/api";
import { formatLedgerTime } from "@/lib/utils";

interface Props {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ theme?: string }>;
}

function truncate(str: string, start = 8, end = 6) {
  if (str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}…${str.slice(-end)}`;
}

export default async function WidgetTxPage({ params, searchParams }: Props) {
  const { hash } = await params;
  const { theme } = await searchParams;
  const isLight = theme === "light";

  const bg = isLight ? "#ffffff" : "#080c12";
  const cardBg = isLight ? "#f4f5f7" : "#0f1520";
  const border = isLight ? "#e2e5ea" : "rgba(255,255,255,0.07)";
  const text = isLight ? "#111827" : "#e8eaf0";
  const muted = isLight ? "#6b7280" : "rgba(255,255,255,0.45)";
  const accent = "#38bdf8";

  let data;
  let errorMsg: string | null = null;

  try {
    data = await fetchTransaction(hash);
  } catch (err) {
    errorMsg = isApiError(err)
      ? err.error.message
      : "Failed to load transaction.";
  }

  if (errorMsg || !data) {
    return (
      <div
        style={{
          background: bg,
          color: text,
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          padding: "20px",
          minHeight: "120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
          ⚠ {errorMsg ?? "Unknown error"}
        </p>
        <a
          href={`https://stellar-explain.xyz/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: accent, fontSize: "12px", marginTop: "8px" }}
        >
          Try viewing on Stellar Explain →
        </a>
        <p style={{ color: muted, fontSize: "11px", marginTop: "12px" }}>
          Powered by{" "}
          <a
            href="https://stellar-explain.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: accent }}
          >
            Stellar Explain
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: bg,
        color: text,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        padding: "16px",
        fontSize: "13px",
        lineHeight: "1.5",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Transaction
          </p>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: muted,
              margin: 0,
              wordBreak: "break-all",
            }}
          >
            {truncate(data.transaction_hash)}
          </p>
        </div>
        <span
          style={{
            background: data.successful ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: data.successful ? "#4ade80" : "#f87171",
            border: `1px solid ${data.successful ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {data.successful ? "Confirmed" : "Failed"}
        </span>
      </div>

      {/* Summary */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "10px",
        }}
      >
        <p style={{ color: muted, fontSize: "10px", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Summary
        </p>
        <p style={{ margin: 0, color: text, fontSize: "13px" }}>{data.summary}</p>
      </div>

      {/* Timeline */}
      {(data.ledger_closed_at || data.ledger) && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "10px",
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          {data.ledger_closed_at && (
            <div>
              <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Confirmed at
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: muted, margin: 0 }}>
                {formatLedgerTime(data.ledger_closed_at)}
              </p>
            </div>
          )}
          {data.ledger && (
            <div>
              <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ledger
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: muted, margin: 0 }}>
                #{data.ledger.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payments */}
      {data.payment_explanations.length > 0 && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "10px",
          }}
        >
          <p style={{ color: muted, fontSize: "10px", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Payments ({data.payment_explanations.length})
          </p>
          {data.payment_explanations.slice(0, 3).map((p, i) => (
            <div
              key={i}
              style={{
                borderTop: i > 0 ? `1px solid ${border}` : "none",
                paddingTop: i > 0 ? "8px" : 0,
                marginTop: i > 0 ? "8px" : 0,
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px" }}>From</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: muted, margin: 0 }}>
                  {truncate(p.from)}
                </p>
              </div>
              <div>
                <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px" }}>To</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: muted, margin: 0 }}>
                  {truncate(p.to)}
                </p>
              </div>
              <div>
                <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px" }}>Amount</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: muted, margin: 0 }}>
                  {p.amount} <span style={{ color: isLight ? "#9ca3af" : "rgba(255,255,255,0.3)" }}>{p.asset}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
        <a
          href={`https://stellar-explain.xyz/tx/${data.transaction_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: accent, fontSize: "12px", textDecoration: "none" }}
        >
          View full explanation →
        </a>
        <p style={{ color: muted, fontSize: "11px", margin: 0 }}>
          Powered by{" "}
          <a
            href="https://stellar-explain.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: accent, textDecoration: "none" }}
          >
            Stellar Explain
          </a>
        </p>
      </div>
    </div>
  );
}