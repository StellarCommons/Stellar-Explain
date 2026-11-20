/**
 * StarLogo — the Stellar Explain brand mark.
 *
 * A 4-pointed diamond star with a white-hot core that fades to sky-blue at
 * the tips, matching the full favicon design. Safe to use at any size; the
 * gradient reads well even at 10 px.
 *
 * The gradient id is intentionally hard-coded (`sl`). SVG gradient ids are
 * scoped to the document, so duplicate definitions across multiple instances
 * of this component are harmless — the first one wins.
 */
export default function StarLogo({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sl" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="30%"  stopColor="#e0f2fe" />
          <stop offset="70%"  stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      {/* Outer R=10, inner R=3  →  sharp Stellar 4-point star
          Inner point coords at 45°: 3 × cos45° ≈ 2.12            */}
      <path
        d="M12 2L14.12 9.88L22 12L14.12 14.12L12 22L9.88 14.12L2 12L9.88 9.88Z"
        fill="url(#sl)"
      />
    </svg>
  );
}
