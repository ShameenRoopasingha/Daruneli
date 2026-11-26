'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Phone, ArrowRight, Sparkles, Globe, UserCheck } from 'lucide-react';
import { useMotherPortal } from '@/lib/motherPortalI18n';

interface DemoAccountChip {
  name: string;
  idOrPhone: string;
  pin: string;
  desc: string;
}

const DEMO_CHIPS: DemoAccountChip[] = [
  { name: 'Inoka Dilhani', idOrPhone: '0771234567', pin: '1234', desc: 'Week 32 • Normal' },
  { name: 'Iresha Bandara', idOrPhone: '887654322V', pin: '7412', desc: 'Week 24 • High Risk' },
  { name: 'Nimali Perera', idOrPhone: '0771122334', pin: '2580', desc: 'Week 28 • Precious' },
  { name: 'Dilini Jayawardena', idOrPhone: '957654321V', pin: '9630', desc: 'Week 32 • Normal' },
];

export default function MotherLoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useMotherPortal();

  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cycleLang = () => {
    if (lang === 'si') setLang('ta');
    else if (lang === 'ta') setLang('en');
    else setLang('si');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Please enter your Phone number or National Identity Card (NIC).');
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
        body: JSON.stringify({ identifier: identifier.trim(), pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please verify credentials.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'daruneli_mother_session',
          JSON.stringify({
            mother_name: data.mother_name,
            mother_id: data.mother_id,
            mother_nic: data.mother_nic || identifier,
            demo_mode: data.demo_mode ?? false,
          })
        );
      }

      router.push('/mother-portal');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error signing in.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc: DemoAccountChip) => {
    setIdentifier(acc.idOrPhone);
    setPin(acc.pin);
    setErrorMsg(null);
  };

  const handleQuickDemoLogin = async (acc: DemoAccountChip) => {
    setIdentifier(acc.idOrPhone);
    setPin(acc.pin);
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/mother-portal/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: acc.idOrPhone, pin: acc.pin, is_demo: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Demo login failed.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'daruneli_mother_session',
          JSON.stringify({
            mother_name: data.mother_name,
            mother_id: data.mother_id,
            mother_nic: data.mother_nic || acc.idOrPhone,
            demo_mode: true,
          })
        );
      }

      router.push('/mother-portal');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error signing in.');
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs active:scale-95 transition-transform"
        >
          <Globe className="w-3.5 h-3.5 text-teal-600" />
          <span>{lang === 'si' ? 'සිංහල' : lang === 'ta' ? 'தமிழ்' : 'English'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800">
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
            {t.brand.name}
          </h1>
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mt-0.5">
            {t.brand.sub}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-2 leading-relaxed">
            {t.auth.loginSub}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Form */}
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
                placeholder="0771234567 or 887654322V"
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
            className="w-full mt-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-50 active:scale-[0.99]"
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
            Verified Demo Accounts
          </span>
        </div>

        {/* Demo Account Chips */}
        <div className="space-y-1.5 mb-4">
          <p className="text-[10px] text-slate-400 font-medium text-center">
            Click any mother to test individual login:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {DEMO_CHIPS.map((chip) => (
              <button
                key={chip.name}
                type="button"
                onClick={() => handleQuickDemoLogin(chip)}
                className="text-left p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-teal-500 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-teal-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {chip.name.split(' ')[0]}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  PIN: <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{chip.pin}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/mother-portal/join"
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
          >
            {t.auth.haveInvite}
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
