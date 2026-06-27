"use client";

import { useEffect, useState } from "react";

interface KeyboardShortcutHintProps {
  keys: string[];
  className?: string;
}

export function KeyboardShortcutHint({
  keys,
  className = "",
}: KeyboardShortcutHintProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const isTouch = () => {
      return (
        window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0
      );
    };
    setIsDesktop(!isTouch());
  }, []);

  if (!isMounted || !isDesktop) return null;

  return (
    <kbd
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono ${className}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-muted)",
        fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
      }}
    >
      {keys.map((key, idx) => (
        <span key={idx}>
          {key}
          {idx < keys.length - 1 && <span className="mx-0.5">+</span>}
        </span>
      ))}
    </kbd>
  );
}
