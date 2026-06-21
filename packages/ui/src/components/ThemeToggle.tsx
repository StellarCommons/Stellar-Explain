"use client";

import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: "var(--accent-sky-dim)",
        border: "1px solid var(--border-accent)",
        color: "var(--accent-sky)",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:opacity-80 active:scale-95 transition-all"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
