interface LabelProps {
  children: React.ReactNode;
}

export function Label({ children }: LabelProps) {
  return (
    <p
      className="text-[10px] font-mono uppercase tracking-widest mb-1"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </p>
  );
}
