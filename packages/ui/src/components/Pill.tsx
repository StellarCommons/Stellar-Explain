import type { PillVariant } from "@/types";

interface PillProps {
  label: string;
  variant?: PillVariant;
}

const variantClasses: Record<PillVariant, string> = {
  success: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  fail:    "bg-red-900/40 text-red-300 border-red-700/50",
  warning: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  default: "bg-sky-900/40 text-sky-300 border-sky-700/50",
};

export function Pill({ label, variant = "default" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}