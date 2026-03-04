import React from 'react'
import { FEATURES } from '@/lib/landing-data'

function WhatWeDecodeSection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-20 border-t border-white/5">
        <div className="text-center mb-14">
          <p className="text-xs font-mono text-sky-400/70 uppercase tracking-widest mb-3">
            Coverage
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            What we decode
          </h2>
          <p className="text-sm text-white/35 mt-3 max-w-sm mx-auto">
            Every major Stellar operation type, explained in context.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="group flex items-start gap-4 rounded-xl border border-white/7 bg-white/2 px-5 py-4 hover:border-sky-500/20 hover:bg-white/4 transition-all duration-300"
            >
              <div className="mt-0.5 w-2 h-2 rounded-full bg-sky-400/50 shrink-0 group-hover:bg-sky-400 group-hover:shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-all duration-300" />
              <div>
                <p className="text-sm font-semibold text-white/80 font-mono mb-0.5">
                  {f.label}
                </p>
                <p className="text-xs text-white/35 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
  )
}

export default WhatWeDecodeSection