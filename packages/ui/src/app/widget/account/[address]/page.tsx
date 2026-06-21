import { fetchAccount, isApiError } from "@/lib/api";
import { formatBalance } from "@/lib/utils";

interface Props {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ theme?: string }>;
}

function truncate(str: string, start = 8, end = 6) {
  if (str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}…${str.slice(-end)}`;
}

export default async function WidgetAccountPage({ params, searchParams }: Props) {
  const { address } = await params;
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
    data = await fetchAccount(address);
  } catch (err) {
    errorMsg = isApiError(err)
      ? err.error.message
      : "Failed to load account.";
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
          href={`https://stellar-explain.xyz/account/${address}`}
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
      <div style={{ marginBottom: "12px" }}>
        <p style={{ color: muted, fontSize: "10px", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Account
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
          {truncate(data.address, 12, 8)}
        </p>
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

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {[
          { label: "XLM Balance", value: formatBalance(data.xlm_balance), sub: "XLM" },
          { label: "Other Assets", value: String(data.asset_count), sub: "trust lines" },
          { label: "Signers", value: String(data.signer_count), sub: "keys" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            <p style={{ color: muted, fontSize: "10px", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {stat.label}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "15px", color: text, margin: "0 0 2px" }}>
              {stat.value}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: muted, margin: 0 }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Home domain */}
      {data.home_domain && (
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
            Home Domain
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: muted, margin: 0 }}>
            {data.home_domain}
          </p>
        </div>
      )}

      {/* Flags */}
      {data.flag_descriptions.length > 0 && (
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
            Account Flags
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {data.flag_descriptions.map((flag, i) => (
              <span
                key={i}
                style={{
                  background: "rgba(251,191,36,0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "11px",
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
        <a
          href={`https://stellar-explain.xyz/account/${data.address}`}
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