"use client";

import { useEffect, useState, useRef } from "react";
import { useAppShell } from "@/components/AppShellContext";

interface CommandPaletteItem {
  id: string;
  type: "transaction" | "account";
  label: string;
  icon: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [items, setItems] = useState<CommandPaletteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const appShell = useAppShell();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const mockHistory: CommandPaletteItem[] = [
      {
        id: "0x1234",
        type: "transaction",
        label: "TX: 1234567890abcdef...",
        icon: "⚡",
      },
      {
        id: "GABC123",
        type: "account",
        label: "Account: GABC123...",
        icon: "👤",
      },
    ];

    const filtered = query
      ? mockHistory.filter(
          (item) =>
            fuzzyMatch(query, item.label) || fuzzyMatch(query, item.id)
        )
      : mockHistory;

    setItems(filtered);
    setSelectedIdx(0);
  }, [query, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((idx) =>
        idx < items.length - 1 ? idx + 1 : idx
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((idx) => (idx > 0 ? idx - 1 : 0));
    } else if (e.key === "Enter" && items.length > 0) {
      e.preventDefault();
      const selected = items[selectedIdx];
      if (selected) {
        appShell.addEntry(selected.type, selected.id, selected.label);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-lg"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search history..."
            className="w-full px-3 py-2 rounded text-sm font-mono outline-none"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-accent)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length > 0 ? (
            items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  appShell.addEntry(item.type, item.id, item.label);
                  onClose();
                }}
                className="w-full px-4 py-2 text-left text-xs font-mono transition-colors"
                style={{
                  background:
                    idx === selectedIdx
                      ? "var(--accent-sky-dim)"
                      : "transparent",
                  color:
                    idx === selectedIdx
                      ? "var(--accent-sky)"
                      : "var(--text-secondary)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-xs text-gray-500">
              No recent items
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
