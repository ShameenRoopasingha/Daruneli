'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Edit3,
  Copy,
  Check,
  Key,
  Mail,
  Building2,
  Phone,
  Shield,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { StaffMember, PhmAreaSummary } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrCreated: StaffMember) => void;
  staffToEdit?: StaffMember | null;
  availableAreas: PhmAreaSummary[];
}

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let res = 'Daruneli@';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res + '26';
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  staffToEdit,
  availableAreas,
}) => {
  const { t, language } = useLanguage();
  const isEditing = !!staffToEdit;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<'PHM' | 'PHNS'>('PHM');
  const [phmAreaId, setPhmAreaId] = useState<string>('');
  const [preferredLang, setPreferredLang] = useState<'si' | 'ta' | 'en'>('si');

  // New user auth credential choices
  const [credentialMethod, setCredentialMethod] = useState<'TEMP_PASSWORD' | 'INVITE_LINK'>('TEMP_PASSWORD');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (staffToEdit) {
      setFullName(staffToEdit.fullName);
      setEmail(staffToEdit.email);
      setPhone(staffToEdit.phone || '');
      setEmployeeId(staffToEdit.employeeId || '');
      setRole((staffToEdit.role as 'PHM' | 'PHNS') || 'PHM');
      setPhmAreaId(staffToEdit.phmAreaId || '');
      setPreferredLang(staffToEdit.preferredLang || 'si');
      setErrorMessage(null);
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setEmployeeId('');
      setRole('PHM');
      setPhmAreaId(availableAreas[0]?.id || '');
      setPreferredLang('si');
      setCredentialMethod('TEMP_PASSWORD');
      setTempPassword(generateSecurePassword());
      setCopied(false);
      setErrorMessage(null);
    }
  }, [staffToEdit, availableAreas, isOpen]);

  if (!isOpen) return null;

  const handleCopyPassword = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegeneratePassword = () => {
    setTempPassword(generateSecurePassword());
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid official email is required.');
      return;
    }
    if (role === 'PHM' && !phmAreaId) {
      setErrorMessage('PHM staff must be assigned to an active PHM Clinic Area.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && staffToEdit) {
        // PATCH
        const res = await fetch(`/api/admin/users/${staffToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            employeeId: employeeId.trim(),
            role,
            phmAreaId: role === 'PHM' ? phmAreaId : null,
            preferredLang,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to update staff member.');
        }
        onSuccess(json.data);
      } else {
        // POST
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            employeeId: employeeId.trim(),
            role,
            phmAreaId: role === 'PHM' ? phmAreaId : null,
            preferredLang,
            tempPassword: credentialMethod === 'TEMP_PASSWORD' ? tempPassword : null,
            sendInvite: credentialMethod === 'INVITE_LINK',
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to provision new staff member.');
        }
        onSuccess(json.data);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-50 to-slate-50 dark:from-slate-800 dark:to-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing
                  ? language === 'si'
                    ? 'නිලධාරි තොරතුරු සහ කොට්ඨාසය සංස්කරණය'
                    : 'Edit Staff Profile & Assignment'
                  : language === 'si'
                  ? 'නව කාර්ය මණ්ඩල නිලධාරියෙකු ලියාපදිංචි කිරීම'
                  : 'Provision New Midwifery Staff Member'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'si'
                  ? 'සෞඛ්‍ය වෛද්‍ය නිලධාරී කොට්ඨාස කාර්ය මණ්ඩල දත්ත පද්ධතිය'
                  : 'MOH Division Official Midwifery Roster'}
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-rose-800 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Full Name & Employee ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'si' ? 'සම්පූර්ණ නම (නම මුලකුරු සමග) *' : 'Full Name (with initials) *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. K. A. Sunethra Perera"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'si' ? 'සේවා හැඳුනුම් අංකය' : 'Service / Staff ID'}
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. PHM-MAH-01"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Row 2: Official Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {language === 'si' ? 'නිල විද්‍යුත් තැපෑල (Email) *' : 'Official Health Email *'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. officer@health.gov.lk"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {language === 'si' ? 'දුරකථන අංකය' : 'Mobile Phone Number'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0714589231"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Row 3: Role & Assigned PHM Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                {language === 'si' ? 'තනතුර සහ වගකීම *' : 'Staff Role & Responsibility *'}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'PHM' | 'PHNS')}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="PHM">PHM — Public Health Midwife (Field Level)</option>
                <option value="PHNS">PHNS — Public Health Nursing Sister (Supervisory)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {language === 'si' ? 'පවරන ලද PHM කොට්ඨාසය' : 'Assigned PHM Clinic Area'}
                {role === 'PHM' && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <select
                value={phmAreaId}
                disabled={role === 'PHNS'}
                onChange={(e) => setPhmAreaId(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  role === 'PHNS' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">{role === 'PHNS' ? 'Division-Wide Supervision' : '— Select PHM Area —'}</option>
                {availableAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Preferred UI Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {language === 'si' ? 'කැමති භාෂාව (Mobile App Default Language)' : 'Preferred Application Language'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'si', label: 'සිංහල (Sinhala)' },
                { id: 'ta', label: 'தமிழ் (Tamil)' },
                { id: 'en', label: 'English' },
              ].map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => setPreferredLang(l.id as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                    preferredLang === l.id
                      ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 5: Credential Provisioning (New User Only) */}
          {!isEditing && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {language === 'si' ? 'පිවිසුම් දත්ත සැකසුම (Login Credentials)' : 'Account Authentication'}
                </span>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setCredentialMethod('TEMP_PASSWORD')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      credentialMethod === 'TEMP_PASSWORD'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Temporary Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setCredentialMethod('INVITE_LINK')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      credentialMethod === 'INVITE_LINK'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Email Invite Link
                  </button>
                </div>
              </div>

              {credentialMethod === 'TEMP_PASSWORD' ? (
                <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-teal-600" />
                      Generated Temporary Security Key:
                    </span>
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-300 flex items-center gap-1 hover:underline"
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
                      className="flex-1 px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 rounded-lg text-teal-800 dark:text-teal-200 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
                        copied
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white dark:bg-slate-800 border-teal-300 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-teal-700/80 dark:text-teal-400">
                    Share this key securely with the midwife. She will use it to log in to the Daruneli mobile app
                    and download her offline field clinic database.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    A secure account activation link will be automatically dispatched to{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">{email || 'the provided email'}</span>
                    . The officer can set her own password via browser.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {language === 'si' ? 'අවලංගු කරන්න' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isEditing
                ? language === 'si'
                  ? 'වෙනස්කම් සුරකින්න'
                  : 'Save Profile Changes'
                : language === 'si'
                ? 'නිලධාරියා ලියාපදිංචි කරන්න'
                : 'Provision Midwife Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
