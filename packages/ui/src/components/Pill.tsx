import type { PillVariant } from "@/types";

interface PillProps {
  label: string;
  variant?: PillVariant;
}

const variantStyles: Record<PillVariant, React.CSSProperties> = {
  success: {
    background: "var(--pill-success-bg)",
    color: "var(--pill-success-text)",
    borderColor: "var(--pill-success-bg)",
  },
  fail: {
    background: "var(--pill-fail-bg)",
    color: "var(--pill-fail-text)",
    borderColor: "var(--pill-fail-bg)",
  },
  warning: {
    background: "var(--pill-warning-bg)",
    color: "var(--pill-warning-text)",
    borderColor: "var(--pill-warning-bg)",
  },
  default: {
    background: "var(--pill-default-bg)",
    color: "var(--pill-default-text)",
    borderColor: "var(--pill-default-bg)",
  },
};

export function Pill({ label, variant = "default" }: PillProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border"
      style={variantStyles[variant]}
    >
      {label}
    </span>
  );
}
