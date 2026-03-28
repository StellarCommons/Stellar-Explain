import type { Tab } from "@/types";

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

export function SearchBar({
  tab,
  value,
  loading,
  onChange,
  onSubmit,
}: SearchBarProps) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSubmit();
  }

  return (
    <div className="flex gap-2 mb-8">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={PLACEHOLDERS[tab]}
        spellCheck={false}
        className="flex-1 bg-white/4 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono text-white/80 placeholder:text-white/20 outline-none focus:border-sky-500/50 focus:bg-white/5 transition-all"
      />
      <button
        onClick={onSubmit}
        disabled={loading || !value.trim()}
        className="px-5 py-3 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-mono hover:bg-sky-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            loading
          </span>
        ) : (
          "Explain →"
        )}
      </button>
    </div>
  );
}