import type { Tab } from "@/types";

interface TabSwitcherProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "tx", label: "Transaction" },
  { id: "account", label: "Account" },
];

export function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  return (
    <div className="flex gap-1 mb-5 p-1 rounded-lg bg-white/4 border border-white/8 w-fit">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-1.5 rounded-md text-xs font-mono transition-all duration-150 ${
            active === t.id
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              : "text-white/35 hover:text-white/60"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}