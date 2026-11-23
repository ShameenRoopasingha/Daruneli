'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  FileSpreadsheet,
  CalendarDays,
  MapPin,
  Users,
  ShieldCheck,
  Stethoscope,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { CURRENT_USER } from '../lib/mockData';

interface SidebarProps {
  unreviewedEscalationsCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreviewedEscalationsCount = 4,
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    {
      href: '/',
      label: t('nav.overview'),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      href: '/escalations',
      label: t('nav.escalations'),
      icon: AlertTriangle,
      badge: unreviewedEscalationsCount > 0 ? unreviewedEscalationsCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      href: '/reports',
      label: t('nav.reports'),
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      href: '/supervision',
      label: t('nav.supervision'),
      icon: CalendarDays,
      badge: null,
    },
    {
      href: '/areas',
      label: t('nav.areas'),
      icon: MapPin,
      badge: null,
    },
    {
      href: '/users',
      label: t('nav.users'),
      icon: Users,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  Daruneli MOH
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                  SL-FHB
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                MOH Division Portal
              </p>
            </div>
          </div>

          {/* Supervisor Profile Card */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {CURRENT_USER.fullName}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {CURRENT_USER.role}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{CURRENT_USER.mohDivision}</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.badgeColor || 'bg-slate-200 text-slate-700'
                    } ${item.badge > 0 ? 'animate-pulse' : ''}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Sign Out */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.sign_out')}</span>
          </Link>
          <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 text-center">
            Family Health Bureau • Sri Lanka
          </div>
        </div>
      </aside>
    </>
  );
};
