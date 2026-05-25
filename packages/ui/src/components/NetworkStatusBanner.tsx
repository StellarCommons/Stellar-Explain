"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchHealth } from "@/lib/api";

const POLL_INTERVAL = 60_000; // 60 seconds

export default function NetworkStatusBanner() {
  const [degraded, setDegraded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    try {
      const health = await fetchHealth();
      const isOk = health.status === "ok" && health.horizon_reachable;
    // const isOk = false;
      setDegraded(!isOk);
      // If network recovered, un-dismiss so banner can show again if it degrades later
      if (isOk) setDismissed(false);
    } catch {
      // fetch failed entirely — treat as degraded
      setDegraded(true);
    }
  }, []);

  useEffect(() => {
    // Run immediately on mount, non-blocking
    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [check]);

  if (!degraded || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        backgroundColor: "#451a03",
        borderBottom: "1px solid #92400e",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flex: 1,
        }}
      >
        {/* Warning icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M8 1.5L14.5 13H1.5L8 1.5Z"
            stroke="#fbbf24"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <line x1="8" y1="6" x2="8" y2="9.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.7" fill="#fbbf24" />
        </svg>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#fde68a",
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontWeight: 500 }}>Stellar network connectivity is degraded.</span>
          {" "}Explanations may be unavailable or slower than usual.
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss network warning"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "#fbbf24",
          opacity: 0.7,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}