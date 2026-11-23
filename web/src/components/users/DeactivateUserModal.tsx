'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { StaffMember } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: StaffMember) => void;
  staff: StaffMember | null;
}

export const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  staff,
}) => {
  const { language } = useLanguage();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !staff) return null;

  const isDeactivating = staff.isActive; // if currently active, action is deactivating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${staff.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !isDeactivating,
          reason: reason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update account status.');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDeactivating
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
              : 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                isDeactivating
                  ? 'bg-rose-600 shadow-rose-600/20'
                  : 'bg-teal-600 shadow-teal-600/20'
              }`}
            >
              {isDeactivating ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isDeactivating
                  ? language === 'si'
                    ? 'කාර්ය මණ්ඩල ගිණුම අක්‍රිය කිරීම'
                    : 'Deactivate Staff Account'
                  : language === 'si'
                  ? 'ගිණුම නැවත සක්‍රිය කිරීම'
                  : 'Reactivate Staff Account'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {staff.fullName} • {staff.role} {staff.phmAreaCode ? `(${staff.phmAreaCode})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-rose-800 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isDeactivating ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                  <p className="font-bold">Sync Access & Security Lockout</p>
                  <p className="mt-1">
                    Deactivating will ban the officer&apos;s authentication token. The mobile app will display an
                    authorized contact notice on sync attempts without deleting cached local clinical records.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'si'
                    ? 'අක්‍රිය කිරීමට හේතුව (විකල්පයි)'
                    : 'Administrative Reason (Optional / Recommended)'}
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Extended study leave, transfer to another MOH area, retirement..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
                  <p className="font-bold">Restore Mobile & Cloud Synchronization</p>
                  <p className="mt-1">
                    Reactivating will unban the account and restore mobile sign-in. The midwife can immediately resume
                    two-way synchronization of maternal and child health records.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'si' ? 'යළි සක්‍රිය කිරීමේ සටහන' : 'Reactivation Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Returned from approved leave, resuming clinical duties..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {language === 'si' ? 'අවලංගු කරන්න' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                isDeactivating
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
              }`}
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isDeactivating
                ? language === 'si'
                  ? 'ගිණුම අක්‍රිය කරන්න'
                  : 'Confirm Account Lockout'
                : language === 'si'
                ? 'යළි සක්‍රිය කරන්න'
                : 'Confirm Reactivation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
