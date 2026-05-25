"use client";

import { AppShellContext, AppShellContextValue } from "./AppShellContext";


interface Props {
  children: React.ReactNode;
}

// Minimal AppShell — provides context with stub values.
// Replace this file progressively as UI #21, #22, #24 are implemented.
export default function AppShell({ children }: Props) {
  const contextValue: AppShellContextValue = {
    addEntry: () => {},
    isSaved: () => false,
    getEntry: () => undefined,
    saveAddress: () => false,
    removeAddress: () => {},
    copy: (text) => {
      navigator.clipboard.writeText(text).catch(() => null);
    },
    personalise: (text) => text,
    isPersonalModeActive: false,
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div
        className="min-h-screen bg-[#080c12] text-white"
        style={{ fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
      >
        {/* Grid background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Horizon glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 70%)",
          }}
        />

        {/* App header */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-10 pb-4">
          <a
            href="/app"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
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
            <span
              className="text-base font-semibold tracking-tight text-white/90"
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
            >
              Stellar Explain
            </span>
          </a>
        </div>

        {/* Page content */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pb-24">
          {children}
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
