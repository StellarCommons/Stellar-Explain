interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm p-5 ${className}`}
    >
      {children}
    </div>
  );
}