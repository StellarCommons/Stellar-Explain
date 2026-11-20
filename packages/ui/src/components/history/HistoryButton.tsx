"use client";

import { KeyboardShortcutHint } from "@/components/KeyboardShortcutHint";

interface HistoryButtonProps {
  onClick: () => void;
}

export function HistoryButton({ onClick }: HistoryButtonProps) {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all active:scale-95"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
      title="History (Cmd+H / Ctrl+H)"
    >
      <span>📜</span>
      History
      <KeyboardShortcutHint keys={[modKey, "H"]} className="ml-auto" />
    </button>
  );
}
