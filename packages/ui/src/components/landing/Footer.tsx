import Link from "next/link";
import React from "react";
import StarLogo from "@/components/StarLogo";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 px-6 sm:px-10 py-8 max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-sky-400/10 border border-sky-400/25 flex items-center justify-center">
          <StarLogo size={10} />
        </div>
        <span className="text-xs font-mono text-white/25">Stellar Explain</span>
      </div>

      <div className="flex items-center gap-6 text-xs font-mono text-white/25">
        <a
          href="https://github.com/StellarCommons/Stellar-Explain"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/50 transition-colors"
        >
          GitHub
        </a>
        <a
          href="https://github.com/StellarCommons/Stellar-Explain/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/50 transition-colors"
        >
          Issues
        </a>
        <Link href="/app" className="hover:text-white/50 transition-colors">
          App
        </Link>
      </div>

      <p className="text-xs font-mono text-white/15">
        Built on Stellar Horizon
      </p>
    </footer>
  );
}
