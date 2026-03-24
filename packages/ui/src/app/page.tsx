'use client";';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import Navbar from '@/components/landing/Navbar';
import UseCasesSection from '@/components/landing/UseCasesSection';
import WhatWeDecodeSection from '@/components/landing/WhatWeDecodeSection';

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#080c12] text-white overflow-x-hidden"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      {/* ── Background layers ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(56,189,248,0.03) 25%, transparent 25%), linear-gradient(225deg, rgba(56,189,248,0.03) 25%, transparent 25%)',
          backgroundSize: '96px 96px',
        }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 65%)',
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-[500px] h-[400px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 0% 100%, rgba(56,189,248,0.04) 0%, transparent 60%)',
        }}
      />

      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <WhatWeDecodeSection />
      <UseCasesSection />
    </div>
  );
}
