'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, ShieldCheck, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { isDemoMode, createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDemoLogin = () => {
    router.push('/');
  };

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (isDemoMode) {
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();
      if (!supabase) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'PHM') {
        setErrorMsg(
          'Access Restricted: The Web Supervision Portal is reserved for PHNS and MOH supervisor officers. Field midwives should use the Suwa Mobile App.'
        );
        await supabase.auth.signOut();
        return;
      }

      router.push('/');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
        {/* Emblem & Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-700/30 mb-3">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Suwa • MOH Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Maternal & Child Health Supervision System
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold text-teal-800 dark:text-teal-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MOH & PHNS Officers Only</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSupabaseLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Supervisor Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="moh.maharagama@health.gov.lk"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider & Prominent Demo Login Button */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <span className="relative bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Or Test Immediately
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all"
        >
          <span>🚀 Enter Offline Demo Dashboard (Maharagama MOH)</span>
        </button>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-5">
          Government of Sri Lanka • Ministry of Health & Family Health Bureau
        </p>
      </div>
    </div>
  );
}
