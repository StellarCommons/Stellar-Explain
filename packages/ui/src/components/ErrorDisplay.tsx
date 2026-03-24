"use client";

import { isApiError } from "@/lib/errors";
import type { ApiError } from "@/types";

interface Props {
  error: ApiError | Error | unknown;
  identifier?: string; // hash or address — used in NOT_FOUND message
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, identifier, onRetry }: Props) {
  const { title, message, showRetry } = resolveError(error, identifier);

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "12px",
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Icon + title row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <circle cx="7" cy="7" r="6" stroke="rgba(239,68,68,0.7)" strokeWidth="1.2" />
          <line
            x1="7" y1="4" x2="7" y2="7.5"
            stroke="rgba(239,68,68,0.7)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.5" r="0.7" fill="rgba(239,68,68,0.7)" />
        </svg>
        <p
          style={{
            margin: 0,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px",
            fontWeight: 600,
            color: "rgba(239,68,68,0.8)",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </p>
      </div>

      {/* Message */}
      <p
        style={{
          margin: 0,
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: "13px",
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>

      {/* Retry button */}
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          style={{
            alignSelf: "flex-start",
            marginTop: "4px",
            padding: "6px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)",
            color: "rgba(239,68,68,0.8)",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "rgba(239,68,68,0.15)";
            btn.style.color = "rgba(239,68,68,1)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "rgba(239,68,68,0.08)";
            btn.style.color = "rgba(239,68,68,0.8)";
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ── Error resolution logic ─────────────────────────────────────────────────

interface Resolved {
  title: string;
  message: string;
  showRetry: boolean;
}

function resolveError(error: unknown, identifier?: string): Resolved {
  if (isApiError(error)) {
    const message = error.error.message;
    switch (error.error.code) {
      case "NOT_FOUND":
        return {
          title: "NOT FOUND",
          message: identifier
            ? `"${truncate(identifier)}" was not found on the Stellar network. Check the value and try again.`
            : "This was not found on the Stellar network. Check the value and try again.",
          showRetry: false,
        };
      case "UPSTREAM_ERROR":
        return {
          title: "NETWORK ERROR",
          message: "Stellar network is temporarily unreachable — please try again in a moment.",
          showRetry: true,
        };
      case "BAD_REQUEST":
        return {
          title: "INVALID REQUEST",
          message: message ?? "Bad request — please check your input.",
          showRetry: false,
        };
      default:
        return {
          title: "ERROR",
          message: message ?? "Something went wrong. Please try again.",
          showRetry: true,
        };
    }
  }

  if (error instanceof Error) {
    return {
      title: "ERROR",
      message: error.message || "Something went wrong. Please try again.",
      showRetry: true,
    };
  }

  return {
    title: "ERROR",
    message: "Something went wrong. Please try again.",
    showRetry: true,
  };
}

function truncate(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}