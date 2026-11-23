import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Daruneli • MOH & PHNS Supervision Portal',
  description: 'National Maternal & Child Health Supervision Web Portal for MOH & PHNS Officers in Sri Lanka',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
