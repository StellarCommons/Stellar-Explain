interface LabelProps {
  children: React.ReactNode;
}

export function Label({ children }: LabelProps) {
  return (
    <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">
      {children}
    </p>
  );
}