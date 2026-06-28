import type { Tab } from "@/types";
import { useRef, useEffect } from "react";
import { KeyboardShortcutHint } from "@/components/KeyboardShortcutHint";

interface SearchBarProps {
  tab: Tab;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const PLACEHOLDERS: Record<Tab, string> = {
  tx: "Paste a transaction hash…",
  account: "Paste a Stellar account address (G…)",
};

export function SearchBar({ tab, value, loading, onChange, onSubmit }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        handleFocusSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSubmit();
  }

  return (
    <div className="flex gap-2 mb-8">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={PLACEHOLDERS[tab]}
        spellCheck={false}
        className="flex-1 rounded-lg px-4 py-3 text-xs font-mono outline-none transition-all"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-accent)";
          e.currentTarget.style.background = "var(--bg-card-hover)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.background = "var(--bg-card)";
        }}
      />
      <div className="flex items-center gap-2">
        <KeyboardShortcutHint keys=["/"]} />
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="px-5 py-3 rounded-lg text-xs font-mono transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "var(--accent-sky-dim)",
            border: "1px solid var(--border-accent)",
            color: "var(--accent-sky)",
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--accent-sky)", borderTopColor: "transparent" }}
              />
              loading
            </span>
          ) : (
            "Explain →"
          )}
        </button>
      </div>
    </div>
  );
}
