import React from "react";

export default function OpenSourceSection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-20 border-t border-white/5">
      <div className="relative rounded-2xl border border-white/8 bg-white/2 overflow-hidden px-8 sm:px-14 py-14 text-center">
        {/* inner glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/4 text-white/40 text-xs font-mono">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Open Source
          </div>

          <h2
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Built in the open.
            <br />
            <span className="text-sky-400">Come build with us.</span>
          </h2>

          <p className="text-sm text-white/40 leading-relaxed max-w-lg mx-auto">
            Stellar Explain is fully open source. Whether you want to add a new
            operation explainer, improve the UI, or fix a bug — every
            contribution makes Web3 more human readable.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="https://github.com/StellarCommons/Stellar-Explain"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/6 border border-white/12 text-white/70 text-sm font-mono hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <a
              href="https://github.com/StellarCommons/Stellar-Explain/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 text-sm font-mono hover:bg-sky-500/25 transition-all duration-200"
            >
              Browse open issues →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
