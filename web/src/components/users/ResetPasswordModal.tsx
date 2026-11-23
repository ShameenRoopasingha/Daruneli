'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Copy,
  Check,
  Mail,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { StaffMember } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
}

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let res = 'Daruneli#';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res + '26';
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  staff,
}) => {
  const { language } = useLanguage();
  const [method, setMethod] = useState<'TEMP_PASSWORD' | 'EMAIL_LINK'>('TEMP_PASSWORD');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMethod('TEMP_PASSWORD');
      setTempPassword(generateSecurePassword());
      setCopied(false);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !staff) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setTempPassword(generateSecurePassword());
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${staff.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempPassword: method === 'TEMP_PASSWORD' ? tempPassword : undefined,
          sendEmail: method === 'EMAIL_LINK',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to reset password.');
      }

      setSuccessMessage(json.message || 'Password credentials updated successfully.');
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'si' ? 'මුරපදය යළි සැකසීම' : 'Reset Account Password'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {staff.fullName} ({staff.email})
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-rose-800 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMethod('TEMP_PASSWORD')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                method === 'TEMP_PASSWORD'
                  ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Temporary Password
            </button>
            <button
              type="button"
              onClick={() => setMethod('EMAIL_LINK')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                method === 'EMAIL_LINK'
                  ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Email Recovery Link
            </button>
          </div>

          {method === 'TEMP_PASSWORD' ? (
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900 dark:text-amber-300">
                  New Temporary Password:
                </span>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={tempPassword}
                  className="flex-1 px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
                    copied
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white dark:bg-slate-800 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                Provide this new key to {staff.fullName}. She can log back in immediately.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A password reset recovery email will be delivered to{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{staff.email}</span> with a secure
                one-time link.
              </p>
            </div>
          )}

          {/* Footer */}
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
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {language === 'si' ? 'මුරපදය යාවත්කාලීන කරන්න' : 'Apply Password Reset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
