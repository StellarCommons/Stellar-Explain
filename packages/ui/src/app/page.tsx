'use client';
import Footer from '@/components/landing/Footer';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import Navbar from '@/components/landing/Navbar';
import OpenSourceSection from '@/components/landing/OpenSourceSection';
import UseCasesSection from '@/components/landing/UseCasesSection';
import WhatWeDecodeSection from '@/components/landing/WhatWeDecodeSection';

export default function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-clip"
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Background layers ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--glow-sky) 25%, transparent 25%), linear-gradient(225deg, var(--glow-sky) 25%, transparent 25%)',
          backgroundSize: '96px 96px',
        }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, var(--glow-sky) 0%, transparent 65%)',
        }}
      />

      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <WhatWeDecodeSection />
      <UseCasesSection />
      <OpenSourceSection />
      <Footer />
    </div>
  );
}
