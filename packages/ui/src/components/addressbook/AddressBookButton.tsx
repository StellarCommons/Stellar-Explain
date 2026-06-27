"use client";

import { KeyboardShortcutHint } from "@/components/KeyboardShortcutHint";

interface AddressBookButtonProps {
  onClick: () => void;
}

export function AddressBookButton({ onClick }: AddressBookButtonProps) {
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
      title="Address Book (Cmd+B / Ctrl+B)"
    >
      <span>📖</span>
      Address Book
      <KeyboardShortcutHint keys={[modKey, "B"]} className="ml-auto" />
    </button>
  );
}
