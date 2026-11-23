'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, Lock, ArrowRight, AlertCircle, Sparkles, Globe } from 'lucide-react';
import { useMotherPortal, MotherLang } from '@/lib/motherPortalI18n';

export default function MotherLoginPage() {
  const router = useRouter();
  const { lang, setLang, t } = useMotherPortal();

  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cycleLang = () => {
    const next: MotherLang = lang === 'si' ? 'ta' : lang === 'ta' ? 'en' : 'si';
    setLang(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your registered Phone Number or NIC.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg('Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/mother-portal/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'daruneli_mother_session',
          JSON.stringify({
            mother_name: data.mother_name,
            mother_id: data.mother_id,
            demo_mode: data.demo_mode ?? false,
          })
        );
        document.cookie = `daruneli_mother_session=active; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        document.cookie = `daruneli_user_role=MOTHER; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      }

      router.push('/mother-portal');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error signing in.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'daruneli_mother_session',
        JSON.stringify({
          mother_name: 'Inoka Dilhani',
          mother_id: 'moth_demo_001',
          demo_mode: true,
        })
      );
      document.cookie = `daruneli_mother_session=active; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = `daruneli_user_role=MOTHER; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
    router.push('/mother-portal');
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
        {/* Brand Emblem & Header */}
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <Image
              src="/images/daruneli-emblem.png"
              alt="Daruneli Emblem"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.auth.loginTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {t.auth.loginSub}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t.auth.identifierLabel}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t.auth.identifierPlaceholder}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t.auth.pin}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-50"
          >
            <span>{loading ? 'Signing In...' : t.auth.loginBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Or Demo Experience
          </span>
        </div>

        {/* Try Demo Mother Portal Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          className="w-full py-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-2 transition-all min-h-[46px]"
        >
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>{t.auth.demoBtn}</span>
        </button>

        <div className="mt-5 text-center">
          <Link
            href="/mother-portal/join"
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
          >
            {t.auth.haveInvite}
          </Link>
        </div>
      </div>

      {/* Official Government & Bitgard Footer */}
      <footer className="text-center mt-6 space-y-1">
        <div className="flex items-center justify-center gap-1.5 opacity-80">
          <div className="relative w-4 h-6">
            <Image
              src="/images/sri-lanka-emblem.png"
              alt="State Emblem"
              fill
              sizes="16px"
              className="object-contain"
            />
          </div>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {t.brand.ministry}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">{t.brand.poweredBy}</p>
      </footer>
    </div>
  );
}
