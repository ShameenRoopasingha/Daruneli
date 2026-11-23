'use client';

import React from 'react';
import { useLanguage } from '../lib/i18n';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
      <Globe className="w-4 h-4 ml-1.5 mr-1 text-slate-500 dark:text-slate-400" />
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
          language === 'en'
            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage('si')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
          language === 'si'
            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        සිංහල
      </button>
    </div>
  );
};
