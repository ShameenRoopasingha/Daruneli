'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Calendar, Lock, CheckCircle2, AlertCircle, ArrowRight, Globe } from 'lucide-react';
import { useMotherPortal, MotherLang } from '@/lib/motherPortalI18n';

function JoinPortalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang, t } = useMotherPortal();

  const [inviteCode, setInviteCode] = useState('');
  const [dob, setDob] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const codeFromQuery = searchParams.get('code');
    if (codeFromQuery) {
      setInviteCode(codeFromQuery.toUpperCase());
    }
  }, [searchParams]);

  const cycleLang = () => {
    const next: MotherLang = lang === 'si' ? 'ta' : lang === 'ta' ? 'en' : 'si';
    setLang(next);
  };

  const formatDobInput = (val: string) => {
    // Clean non-digits
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDob(formatDobInput(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!inviteCode || inviteCode.trim().length < 5) {
      setErrorMsg('Please enter a valid invite code from your Public Health Midwife.');
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      setErrorMsg(t.auth.invalidDob);
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg('PIN must be exactly 4 numeric digits.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg(t.auth.pinMismatch);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/mother-portal/claim-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: inviteCode,
          dob,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification failed.');
      }

      setSuccessMsg(data.message || 'Portal access activated successfully!');

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'daruneli_mother_session',
          JSON.stringify({
            mother_name: data.mother_name,
            mother_id: data.mother_id,
            mother_nic: data.mother_nic,
            identifier: data.login_identifier,
            demo_mode: data.demo_mode ?? false,
          })
        );
      }

      setTimeout(() => {
        router.push('/mother-portal');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error connecting to registration service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between py-6 px-4">
      {/* Top Header: Trilingual Switcher */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={cycleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-teal-600" />
          <span>{lang === 'si' ? 'සිංහල' : lang === 'ta' ? 'தமிழ்' : 'English'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative w-12 h-16 shrink-0 drop-shadow-sm">
              <Image
                src="/images/sri-lanka-emblem.png"
                alt="State Emblem of Sri Lanka"
                fill
                sizes="96px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <div className="relative w-14 h-14 shrink-0 drop-shadow-sm">
              <Image
                src="/images/daruneli-emblem.png"
                alt="Daruneli Emblem"
                fill
                sizes="112px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.auth.joinTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {t.auth.joinSub}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t.auth.inviteCode}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder={t.auth.invitePlaceholder}
                maxLength={10}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Date of Birth Verification */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t.auth.dob}
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={dob}
                onChange={handleDobChange}
                placeholder="14/05/1991"
                maxLength={10}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{t.auth.dobHint}</p>
          </div>

          {/* 4-Digit PIN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t.auth.pin}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t.auth.pinConfirm}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{t.auth.pinHint}</p>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-50"
          >
            <span>{loading ? 'Activating...' : t.auth.activateBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/mother-portal/login"
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
          >
            {t.auth.alreadyLinked}
          </Link>
        </div>
      </div>

      {/* Official Government & Bitgard Footer */}
      <footer className="text-center mt-6 space-y-1.5 pb-2">
        <div className="flex items-center justify-center gap-2">
          <div className="relative w-5 h-7 shrink-0 opacity-95">
            <Image
              src="/images/sri-lanka-emblem.png"
              alt="State Emblem of Sri Lanka"
              fill
              sizes="64px"
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="text-left">
            <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider leading-tight">
              {t.brand.ministry}
            </span>
            <span className="block text-[10px] text-teal-700 dark:text-teal-400 font-semibold leading-tight">
              Family Health Bureau (FHB) • Sri Lanka
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">{t.brand.poweredBy}</p>
      </footer>
    </div>
  );
}

export default function JoinPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-teal-700">Loading activation form...</div>}>
      <JoinPortalForm />
    </Suspense>
  );
}
