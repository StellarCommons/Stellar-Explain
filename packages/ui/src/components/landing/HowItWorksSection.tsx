import { STEPS } from '@/lib/landing-data';
import React from 'react';

function HowItWorksSection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-20 border-t border-white/5">
      <div className="text-center mb-14">
        <p className="text-xs font-mono text-sky-400/70 uppercase tracking-widest mb-3">
          How it works
        </p>
        <h2
          className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Three steps to clarity
        </h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="group relative rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-sky-500/25 hover:bg-white/4 transition-all duration-300"
          >
            {/* step number watermark */}
            <span className="absolute top-4 right-5 text-5xl font-bold text-white/4 font-mono select-none group-hover:text-sky-400/8 transition-colors duration-300">
              {step.n}
            </span>

            <div className="w-9 h-9 rounded-xl bg-sky-400/8 border border-sky-400/20 flex items-center justify-center text-sky-400 mb-4 group-hover:bg-sky-400/15 transition-colors duration-300">
              {step.icon}
            </div>

            <h3
              className="text-sm font-semibold text-white/90 mb-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {step.title}
            </h3>
            <p className="text-sm text-white/40 leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorksSection;
