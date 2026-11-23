import type { Metadata, Viewport } from 'next';
import React from 'react';
import { MotherPortalProvider } from '@/lib/motherPortalI18n';
import { MotherTopBar } from '@/components/mother-portal/MotherTopBar';
import { MotherNav } from '@/components/mother-portal/MotherNav';
import { InstallPwaBanner } from '@/components/mother-portal/InstallPwaBanner';

export const metadata: Metadata = {
  title: 'Daruneli (දරුනැලි) — Mother Companion Portal',
  description: 'Confidential digital companion for pregnant mothers and newborns by the Family Health Bureau, Ministry of Health Sri Lanka.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Daruneli',
  },
  icons: {
    icon: '/images/daruneli-emblem.png',
    apple: '/images/daruneli-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F8B8D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MotherPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotherPortalProvider>
      <div className="min-h-dvh bg-[#F4FAF8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-dvh pb-20">
          <MotherTopBar />
          <InstallPwaBanner />
          <main className="flex-1 px-4 py-3">{children}</main>
          <MotherNav />
        </div>
      </div>
    </MotherPortalProvider>
  );
}
