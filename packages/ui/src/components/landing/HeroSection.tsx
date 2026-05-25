import Link from 'next/link';
import AnimatedDemo from './AnimatedDemo';

function HeroSection() {
  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-24 sm:pt-24 overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-w-0">
        {/* left — copy */}
        <div className="space-y-8 min-w-0">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/25 bg-sky-500/8 text-sky-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Stellar Mainnet · Live
          </div>

          <div className="space-y-4">
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Stellar transactions,
              <br />
              <span className="text-sky-400">in plain English.</span>
            </h1>
            <p className="text-base text-white/45 leading-relaxed max-w-md">
              Paste any transaction hash or account address. Get a clear, human-readable explanation
              of exactly what happened — no blockchain expertise required.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm font-mono hover:bg-sky-500/30 hover:border-sky-400/50 transition-all duration-200 active:scale-95"
            >
              Try it now
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="group-hover:translate-x-0.5 transition-transform duration-200"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="https://github.com/StellarCommons/Stellar-Explain"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-mono hover:text-white/80 hover:border-white/20 transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>

          <p className="text-xs text-white/20 font-mono">
            Open source · Built on Stellar Horizon · No login required
          </p>
        </div>

        {/* right — animated demo, hard constrained to its column */}
        <div className="w-full min-w-0 overflow-hidden">
          <AnimatedDemo />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
