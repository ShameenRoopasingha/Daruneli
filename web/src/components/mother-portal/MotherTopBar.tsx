'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, LogOut } from 'lucide-react';
import { useMotherPortal, MotherLang } from '@/lib/motherPortalI18n';

export const MotherTopBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useMotherPortal();

  // Hide on login and join
  if (pathname === '/mother-portal/login' || pathname === '/mother-portal/join') {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/mother-portal/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('daruneli_mother_session');
      localStorage.removeItem('daruneli_active_kick_session');
      localStorage.removeItem('daruneli_hospital_bag_checks');
    }
    router.push('/mother-portal/login');
  };

  const cycleLang = () => {
    const next: MotherLang = lang === 'si' ? 'ta' : lang === 'ta' ? 'en' : 'si';
    setLang(next);
  };

  const langLabel = lang === 'si' ? 'සිංහල' : lang === 'ta' ? 'தமிழ்' : 'English';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Emblem & Name */}
        <Link href="/mother-portal" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-teal-200/80 bg-white shadow-xs">
            <Image
              src="/images/daruneli-emblem.png"
              alt="Daruneli"
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {t.brand.name}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Mother Portal
              </span>
            </div>
            <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold line-clamp-1">
              FHB Sri Lanka
            </p>
          </div>
        </Link>

        {/* Controls: Language Switcher & Logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 min-h-[36px] transition-colors"
            title="Switch Language (සිංහල | தமிழ் | English)"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{langLabel}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title={t.nav.logout}
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
