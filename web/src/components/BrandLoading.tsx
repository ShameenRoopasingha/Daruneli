'use client';

import React from 'react';
import Image from 'next/image';

interface BrandLoadingProps {
  messageSi?: string;
  messageEn?: string;
}

export const BrandLoading: React.FC<BrandLoadingProps> = ({
  messageSi = 'දත්ත සමමුහුර්ත වෙමින් පවතී...',
  messageEn = 'Syncing Dashboard...',
}) => {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-6 bg-gradient-to-b from-[#EBF8F5] via-[#F5FCFA] to-white overflow-hidden select-none">
      {/* Decorative SVG Waves */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="webWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F8B8D" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 C380,120 720,40 1440,160 L1440,0 L0,0 Z"
          fill="url(#webWaveGrad)"
        />
        <path
          d="M0,780 C420,680 960,860 1440,740 L1440,900 L0,900 Z"
          fill="url(#webWaveGrad)"
        />
      </svg>

      {/* Top Spacer */}
      <div className="h-8 md:h-16" />

      {/* Upper Brand Block */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-72 h-36 md:w-80 md:h-40 mb-3 drop-shadow-sm">
          <Image
            src="/images/daruneli-logo.png"
            alt="Daruneli Maternal & Child Health System"
            fill
            sizes="(max-width: 768px) 288px, 320px"
            className="object-contain"
            priority
          />
        </div>
        <span className="text-xs md:text-sm font-bold tracking-wider text-slate-700 uppercase">
          MOH &amp; PHNS Supervision Portal
        </span>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          National Midwifery Field Supervision &amp; Clinical Audit Platform
        </p>

        {/* Live Spinner & Animated Progress */}
        <div className="mt-10 flex flex-col items-center">
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* Soft pulsing glow halo */}
            <div className="absolute inset-0 rounded-full bg-teal-200/50 animate-ping opacity-30" />
            {/* Spinning Ring */}
            <svg
              className="w-12 h-12 animate-spin text-teal-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          <div className="mt-4 text-center space-y-0.5">
            <p className="text-sm font-bold text-slate-800">{messageSi}</p>
            <p className="text-xs font-semibold text-slate-500 tracking-wide">{messageEn}</p>
          </div>

          {/* Micro Progress Bar */}
          <div className="w-48 h-1 bg-slate-200/80 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-teal-700 rounded-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Footer Block */}
      <div className="relative z-10 flex flex-col items-center text-center pb-4 pt-8">
        <div className="relative w-7 h-10 mb-2 opacity-95">
          <Image
            src="/images/sri-lanka-emblem.png"
            alt="Sri Lanka State Emblem"
            fill
            sizes="28px"
            className="object-contain"
          />
        </div>
        <p className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">
          MINISTRY OF HEALTH, SRI LANKA
        </p>
        <p className="text-[10px] font-medium text-slate-500 mt-0.5">
          Daruneli Maternal & Child Health System
        </p>
      </div>
    </div>
  );
};
