'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  Key,
  Edit3,
  Lock,
  Unlock,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { StaffMember, UserAuditLogItem, PhmAreaSummary, UserProfile } from '@/lib/types';
import {
  getStaffMembers,
  getAreaSummaries,
  getCurrentUserProfile,
} from '@/lib/dataService';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { useLanguage } from '@/lib/i18n';
import { UserFormModal } from '@/components/users/UserFormModal';
import { DeactivateUserModal } from '@/components/users/DeactivateUserModal';
import { ResetPasswordModal } from '@/components/users/ResetPasswordModal';

export default function StaffManagementPage() {
  const { t, language } = useLanguage();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<UserAuditLogItem[]>([]);
  const [areas, setAreas] = useState<PhmAreaSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PHM' | 'PHNS' | 'MOH'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DEACTIVATED'>('ALL');
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'AUDIT'>('DIRECTORY');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);

  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [staffToDeactivate, setStaffToDeactivate] = useState<StaffMember | null>(null);

  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [staffToResetPassword, setStaffToResetPassword] = useState<StaffMember | null>(null);

  const isMoh = currentUser?.role === 'MOH';

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, areaList, userProfile] = await Promise.all([
        getStaffMembers(),
        getAreaSummaries(),
        getCurrentUserProfile(),
      ]);
      setStaffList(staffData.staff);
      setAuditLogs(staffData.auditLogs);
      setAreas(areaList);
      setCurrentUser(userProfile);
    } catch (err) {
      console.error('Failed to load staff management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
    if (statusFilter === 'ACTIVE' && !s.isActive) return false;
    if (statusFilter === 'DEACTIVATED' && s.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      const matchEmp = (s.employeeId || '').toLowerCase().includes(q);
      const matchArea = (s.phmAreaName || '').toLowerCase().includes(q) || (s.phmAreaCode || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchEmp && !matchArea) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalStaffCount = staffList.length;
  const activePhmCount = staffList.filter((s) => s.role === 'PHM' && s.isActive).length;
  const supervisorCount = staffList.filter((s) => (s.role === 'MOH' || s.role === 'PHNS') && s.isActive).length;
  const deactivatedCount = staffList.filter((s) => !s.isActive).length;

  // Detect vacant areas (no active PHM assigned)
  const vacantAreas = areas.filter(
    (area) => !staffList.some((s) => s.role === 'PHM' && s.isActive && s.phmAreaId === area.id)
  );

  const handleOpenCreateModal = () => {
    setStaffToEdit(null);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffMember) => {
    setStaffToEdit(staff);
    setFormModalOpen(true);
  };

  const handleOpenDeactivateModal = (staff: StaffMember) => {
    setStaffToDeactivate(staff);
    setDeactivateModalOpen(true);
  };

  const handleOpenResetPasswordModal = (staff: StaffMember) => {
    setStaffToResetPassword(staff);
    setResetPasswordModalOpen(true);
  };

  const handleStaffSaved = (updatedOrCreated: StaffMember) => {
    setStaffList((prev) => {
      const index = prev.findIndex((s) => s.id === updatedOrCreated.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = updatedOrCreated;
        return copy;
      }
      return [updatedOrCreated, ...prev];
    });
    // refresh audit logs in background
    getStaffMembers().then((data) => setAuditLogs(data.auditLogs));
  };

  const handleStatusChanged = (updated: StaffMember) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, isActive: updated.isActive, deactivatedAt: updated.deactivatedAt } : s))
    );
    getStaffMembers().then((data) => setAuditLogs(data.auditLogs));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('users.title')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('users.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Refresh Staff Roster"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isMoh ? (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('users.add_staff')}</span>
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>{language === 'si' ? 'MOH පමණක් සංස්කරණය කළ හැක' : 'MOH Role Required for Staff Changes'}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('users.kpi_total')}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {loading ? '-' : totalStaffCount}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">MOH Division Roster</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('users.kpi_active_phm')}
            </span>
            <Building2 className="w-4 h-4 text-teal-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-teal-600 dark:text-teal-400">
            {loading ? '-' : activePhmCount}
          </p>
          <span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">Field Midwives</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('users.kpi_supervisors')}
            </span>
            <Shield className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {loading ? '-' : supervisorCount}
          </p>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">Supervisory Level</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('users.kpi_deactivated')}
            </span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {loading ? '-' : deactivatedCount}
          </p>
          <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Sync Locked</span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${
          vacantAreas.length > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {t('users.kpi_vacant')}
            </span>
            <AlertTriangle className={`w-4 h-4 ${vacantAreas.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <p className={`mt-2 text-2xl font-extrabold ${vacantAreas.length > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
            {loading ? '-' : vacantAreas.length}
          </p>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
            {vacantAreas.length > 0 ? `${vacantAreas[0].name} vacant` : 'Full Coverage'}
          </span>
        </div>
      </div>

      {/* Tabs Switcher: Directory vs Audit Trail */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'DIRECTORY'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('users.tab_directory')}</span>
            <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStaff.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'AUDIT'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t('users.tab_audit')}</span>
            <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'DIRECTORY' ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'si' ? 'නිලධාරිනියගේ නම, සේවා අංකය, ඊමේල් හෝ කොට්ඨාසය සොයන්න...' : 'Search staff by name, service ID, email, or PHM area...'}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Role filter */}
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
                {(['ALL', 'PHM', 'PHNS', 'MOH'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      roleFilter === r
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {r === 'ALL' ? 'All Roles' : r}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
                {(['ALL', 'ACTIVE', 'DEACTIVATED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Locked'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">{t('users.col_name')}</th>
                    <th className="py-3 px-4">{t('users.col_role')}</th>
                    <th className="py-3 px-4">{t('users.col_area')}</th>
                    <th className="py-3 px-4">{t('users.col_contact')}</th>
                    <th className="py-3 px-4">{t('users.col_status')}</th>
                    <th className="py-3 px-4">{t('users.col_last_login')}</th>
                    <th className="py-3 px-4 text-right">{t('users.col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No staff members found matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr
                        key={staff.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          !staff.isActive ? 'bg-slate-50/30 dark:bg-slate-900/30 opacity-75' : ''
                        }`}
                      >
                        {/* Name & ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                              staff.role === 'MOH'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                : staff.role === 'PHNS'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                            }`}>
                              {staff.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {staff.fullName}
                              </p>
                              {staff.employeeId && (
                                <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {staff.employeeId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            staff.role === 'MOH'
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : staff.role === 'PHNS'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                          }`}>
                            {staff.role}
                          </span>
                        </td>

                        {/* Area */}
                        <td className="py-3.5 px-4">
                          {staff.role === 'PHM' ? (
                            staff.phmAreaName ? (
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {staff.phmAreaName}
                                </span>
                                {staff.phmAreaCode && (
                                  <span className="block text-[11px] text-slate-400 font-mono">
                                    {staff.phmAreaCode}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600 font-semibold text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Area Unassigned
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 text-xs italic">
                              Division-Wide Supervision
                            </span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{staff.email}</span>
                          </div>
                          {staff.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {staff.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {t('users.active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                              {t('users.deactivated')}
                            </span>
                          )}
                        </td>

                        {/* Last Active */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono">
                          {staff.lastSignInAt ? formatDateTime(staff.lastSignInAt) : 'Never logged in'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isMoh ? (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(staff)}
                                  title={t('users.edit')}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenResetPasswordModal(staff)}
                                  title={t('users.reset_password')}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                {staff.id !== currentUser?.id && (
                                  <button
                                    onClick={() => handleOpenDeactivateModal(staff)}
                                    title={staff.isActive ? t('users.deactivate') : t('users.reactivate')}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      staff.isActive
                                        ? 'border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                        : 'border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40'
                                    }`}
                                  >
                                    {staff.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Read-only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Trail View */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              Administrative Roster Security & Modification History
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Immutable tamper-evident record of all staff creation, area reassignments, account suspensions, and password resets.
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No administrative audit records logged yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.action === 'CREATE_USER'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : log.action === 'DEACTIVATE_USER'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            : log.action === 'REACTIVATE_USER'
                            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                            : log.action === 'REASSIGN_AREA'
                            ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}>
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Target: {log.targetUserName || log.targetUserId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Authorized by <span className="font-semibold text-slate-900 dark:text-white">{log.actorName || log.actorId}</span>
                      </p>
                      {log.changes && (
                        <div className="text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg mt-1 border border-slate-100 dark:border-slate-800 max-w-2xl overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-400 shrink-0">
                      {formatDateTime(log.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
      <UserFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleStaffSaved}
        staffToEdit={staffToEdit}
        availableAreas={areas}
      />

      <DeactivateUserModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onSuccess={handleStatusChanged}
        staff={staffToDeactivate}
      />

      <ResetPasswordModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        staff={staffToResetPassword}
      />
    </div>
  );
}
