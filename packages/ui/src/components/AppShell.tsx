"use client";

import { useState } from "react";
import { AppShellContext, AppShellContextValue } from "./AppShellContext";
import StarLogo from "@/components/StarLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tx" | "account">("tx");

  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onFocusSearch: () => {
      const searchInput = document.querySelector(
        'input[placeholder*="Paste"]'
      ) as HTMLInputElement;
      searchInput?.focus();
    },
    onClosePanel: () => {
      setIsCommandPaletteOpen(false);
      setIsHistoryPanelOpen(false);
      setIsAddressBookOpen(false);
    },
    onSwitchToTransaction: () => setActiveTab("tx"),
    onSwitchToAccount: () => setActiveTab("account"),
    onOpenHistory: () => setIsHistoryPanelOpen(true),
    onOpenAddressBook: () => setIsAddressBookOpen(true),
  });

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
        className="min-h-screen"
        style={{
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
        }}
      >
        {/* Grid background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Horizon glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, var(--glow-sky) 0%, transparent 70%)",
          }}
        />

        {/* App header */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-10 pb-4">
          <div className="flex items-center justify-between">
            <a
              href="/app"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--accent-sky-dim)",
                  border: "1px solid var(--border-accent)",
                }}
              >
                <StarLogo size={14} />
              </div>
              <span
                className="text-base font-semibold tracking-tight"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                }}
              >
                Stellar Explain
              </span>
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Page content */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pb-24">
          {children}
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </AppShellContext.Provider>
  );
}
