'use client';

import React from 'react';
import { Menu, Calendar, WifiOff } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { isDemoMode } from '../lib/supabase/client';
import { formatDate } from '../lib/dateFormat';

interface TopHeaderProps {
  onToggleSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar }) => {
  const todayFormatted = formatDate(new Date());

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile hamburger & Date indicator */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{todayFormatted}</span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Sri Lanka Standard Time
          </span>
        </div>
      </div>

      {/* Center / Right: Demo pill, Language Switcher, Theme Toggle */}
      <div className="flex items-center gap-3">
        {isDemoMode && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-sm">
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">Offline Demo Mode</span>
            <span className="text-[10px] font-normal opacity-80">(Maharagama MOH)</span>
          </div>
        )}

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
};
