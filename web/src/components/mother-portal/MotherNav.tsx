'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Activity, Baby, BookOpen } from 'lucide-react';
import { useMotherPortal } from '@/lib/motherPortalI18n';

export const MotherNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useMotherPortal();

  // Hide nav on login and join onboarding screens
  if (pathname === '/mother-portal/login' || pathname === '/mother-portal/join') {
    return null;
  }

  const tabs = [
    {
      href: '/mother-portal',
      label: t.nav.home,
      icon: Heart,
      exact: true,
    },
    {
      href: '/mother-portal/kicks',
      label: t.nav.kicks,
      icon: Activity,
      exact: false,
    },
    {
      href: '/mother-portal/child',
      label: t.nav.baby,
      icon: Baby,
      exact: false,
    },
    {
      href: '/mother-portal/guide',
      label: t.nav.guide,
      icon: BookOpen,
      exact: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all min-h-[48px] ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-full transition-transform ${
                  isActive ? 'bg-teal-50 dark:bg-teal-950/80 scale-110' : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-teal-600 dark:text-teal-400 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[80px]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
