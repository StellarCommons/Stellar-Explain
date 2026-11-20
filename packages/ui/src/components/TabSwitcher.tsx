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
    <div
      className="flex gap-1 mb-5 p-1 rounded-lg w-fit"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-4 py-1.5 rounded-md text-xs font-mono transition-all duration-150"
          style={
            active === t.id
              ? {
                  background: "var(--accent-sky-dim)",
                  color: "var(--accent-sky)",
                  border: "1px solid var(--border-accent)",
                }
              : {
                  color: "var(--text-muted)",
                  border: "1px solid transparent",
                }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
