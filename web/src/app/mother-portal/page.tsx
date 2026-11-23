'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Calendar,
  Phone,
  AlertTriangle,
  HeartPulse,
  Scale,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useMotherPortal } from '@/lib/motherPortalI18n';
import { DEMO_MOTHER_PORTAL_DATA, MotherPortalData } from '@/lib/motherPortalService';
import { DigitalClinicCardModal } from '@/components/mother-portal/DigitalClinicCardModal';

export default function MotherHomePage() {
  const { t } = useMotherPortal();
  const [data, setData] = useState<MotherPortalData>(DEMO_MOTHER_PORTAL_DATA);

  useEffect(() => {
    // Check if session has mother profile or fetch from API
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('daruneli_mother_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.mother_name) {
            setData((prev) => ({
              ...prev,
              mother: {
                ...prev.mother,
                fullName: parsed.mother_name,
              },
            }));
          }
        } catch {}
      }
    }
  }, []);

  const { mother, pregnancy, upcomingSchedule, phmContact, latestVitals } = data;

  // SVG Circular Gestation Progress (out of 40 weeks)
  const currentTotalWeeks = pregnancy.pogWeeks + pregnancy.pogDays / 7;
  const progressRatio = Math.min(1, Math.max(0, currentTotalWeeks / 40));
  const circleRadius = 56;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="space-y-4 pt-1 animate-in fade-in duration-300">
      {/* 1. Warm Greeting & Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-teal-950 text-white p-5 sm:p-6 shadow-xl">
        {/* Soft background glow circles */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-rose-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-200 uppercase tracking-wider">
              {t.home.greetingMorning}, {mother.fullName}
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-600/60 border border-teal-400/40 text-teal-100 uppercase">
              {pregnancy.trimester === 3
                ? t.home.trimester3
                : pregnancy.trimester === 2
                ? t.home.trimester2
                : t.home.trimester1}
            </span>
          </div>

          {/* Gestation Ring & Key Stats */}
          <div className="mt-4 flex items-center gap-5">
            {/* Circular Progress Ring */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                <circle
                  cx="65"
                  cy="65"
                  r={circleRadius}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="65"
                  cy="65"
                  r={circleRadius}
                  stroke="#14B8A6"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-2xl font-black tracking-tight text-white">
                  {pregnancy.pogWeeks}
                </span>
                <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider -mt-0.5">
                  {t.home.weeks} + {pregnancy.pogDays} {t.home.days}
                </span>
              </div>
            </div>

            {/* EDD & Milestone Snapshot */}
            <div className="min-w-0 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-teal-200/90 uppercase tracking-wide block">
                  {t.home.eddLabel}
                </span>
                <div className="text-base font-black text-amber-300 mt-0.5">
                  {pregnancy.edd}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-teal-900/60 border border-teal-700/60 text-[11px] text-teal-100 leading-snug">
                <div className="flex items-center gap-1 font-bold text-amber-300 mb-0.5">
                  <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>{t.home.gestationTitle}</span>
                </div>
                <p className="line-clamp-2">{t.home.milestoneWeek32}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Digital Clinic Pass (H512 Scannable QR Code for Midwife visits) */}
      <DigitalClinicCardModal
        mother={mother}
        pogText={`${pregnancy.pogWeeks} ${t.home.weeks}, ${pregnancy.pogDays} ${t.home.days}`}
      />

      {/* 3. Upcoming Schedule Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t.home.upcomingTitle}
            </span>
            <h3 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
              {t.home.nextHomeVisit}
            </h3>
            <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 mt-0.5">
              {upcomingSchedule.nextVisitDate}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold shrink-0">
          {t.home.inDays} {upcomingSchedule.daysRemaining} {t.home.daysLeft}
        </div>
      </div>

      {/* 3. My Midwife & Emergency Bar */}
      <div className="space-y-2.5">
        {/* Midwife Contact Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 shrink-0">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                {t.home.midwifeTitle}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {phmContact.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {phmContact.areaName}
              </p>
            </div>
          </div>

          <a
            href={`tel:${phmContact.phone}`}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs min-h-[44px]"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{t.home.callMidwife}</span>
          </a>
        </div>

        {/* High-Visibility Emergency Bar */}
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs animate-pulse">
              1990
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-950 dark:text-rose-100">
                {t.home.emergencyCall1990}
              </h4>
              <p className="text-[10px] text-rose-800 dark:text-rose-300 font-medium">
                {t.home.emergencySub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="tel:1990"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm min-h-[40px] flex items-center"
            >
              Call 1990
            </a>
            <Link
              href="/mother-portal/guide"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-700"
              title="Danger Signs"
            >
              <AlertTriangle className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Latest Checkup Snapshot (Plain Language) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {t.home.vitalsTitle}
            </h3>
            <p className="text-[10px] text-slate-400">{t.home.vitalsSub}</p>
          </div>
          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
            {latestVitals.visitDate}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Blood Pressure */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase">Blood Pressure</span>
              <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
              {latestVitals.bp} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md">
              <ShieldCheck className="w-3 h-3" />
              <span>{t.home.bpNormal}</span>
            </div>
          </div>

          {/* Maternal Weight */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase">Weight</span>
              <Scale className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
              {latestVitals.weightKg} <span className="text-[10px] font-normal text-slate-400">kg</span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md">
              <ShieldCheck className="w-3 h-3" />
              <span>{t.home.weightGainGood}</span>
            </div>
          </div>
        </div>

        {/* Quick link to Kick Counter */}
        <Link
          href="/mother-portal/kicks"
          className="mt-2 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🦶</span>
            <div>
              <div className="text-xs font-bold">Today&apos;s Cardiff Kick Count</div>
              <div className="text-[10px] text-amber-800 dark:text-amber-300">
                Log baby movements starting at 9:00 AM
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
