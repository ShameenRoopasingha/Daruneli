'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  ArrowRightLeft,
  MessageSquare,
  Clock,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  CheckCheck,
  Send,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import {
  getAreaSummaries,
  getTimetablesForArea,
  getMotherTransfers,
  getSmsLogs,
} from '@/lib/dataService';
import {
  PhmAreaSummary,
  TimetableTemplateItem,
  ScheduleOverrideItem,
  MotherTransferItem,
  SmsLogItem,
} from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/dateFormat';

export default function SupervisionPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'TIMETABLES' | 'TRANSFERS' | 'SMS'>('TIMETABLES');
  const [areas, setAreas] = useState<PhmAreaSummary[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('area_kot_north');

  // Tab A Data
  const [templates, setTemplates] = useState<TimetableTemplateItem[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverrideItem[]>([]);

  // Tab B & C Data
  const [transfers, setTransfers] = useState<MotherTransferItem[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [areaList, transferList, smsList] = await Promise.all([
          getAreaSummaries(),
          getMotherTransfers(),
          getSmsLogs(),
        ]);
        setAreas(areaList);
        setTransfers(transferList);
        setSmsLogs(smsList);
        if (areaList.length > 0 && !selectedAreaId) {
          setSelectedAreaId(areaList[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadTimetable() {
      if (!selectedAreaId) return;
      const { templates: tList, overrides: oList } = await getTimetablesForArea(selectedAreaId);
      setTemplates(tList);
      setOverrides(oList);
    }
    loadTimetable();
  }, [selectedAreaId]);

  const daysOfWeek = [
    { num: 1, name: 'Monday (සඳුදා)' },
    { num: 2, name: 'Tuesday (අඟහරුවාදා)' },
    { num: 3, name: 'Wednesday (බදාදා)' },
    { num: 4, name: 'Thursday (බ්‍රහස්පතින්දා)' },
    { num: 5, name: 'Friday (සිකුරාදා)' },
    { num: 6, name: 'Saturday (සෙනසුරාදා)' },
  ];

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'HOME_VISIT':
        return { bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300', label: 'Home Visits (ක්ෂේත්‍ර චාරිකා)' };
      case 'ANC_CLINIC':
        return { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', label: 'Antenatal Clinic (මව් සායනය)' };
      case 'CWC_CLINIC':
        return { bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300', label: 'Child Welfare Clinic (ළමා සායනය)' };
      case 'MOH_OFFICE':
        return { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300', label: 'MOH Office Conference' };
      case 'CATCH_UP':
        return { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', label: 'Catch-up & Records' };
      case 'HOLIDAY':
        return { bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', label: 'Public Holiday (නිවාඩු)' };
      case 'LEAVE':
        return { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300', label: 'Approved Leave' };
      default:
        return { bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200', label: type };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Field Supervision & Operations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review PHM weekly advance programmes, inter-area mother relocations, and automated SMS reminder dispatches
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('TIMETABLES')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'TIMETABLES'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{t('supervision.tab_timetables')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSFERS')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'TRANSFERS'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{t('supervision.tab_transfers')}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {transfers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SMS')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'SMS'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t('supervision.tab_sms')}</span>
        </button>
      </div>

      {/* TAB A: WEEKLY ADVANCE PROGRAMMES */}
      {activeTab === 'TIMETABLES' && (
        <div className="space-y-5">
          {/* Area Selector Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Select PHM Area:
              </span>
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code}) — {a.phmOfficerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Standard Timetable • Mon–Sat Schedule
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daysOfWeek.map((day) => {
              const dayTemplates = templates.filter((t) => t.dayOfWeek === day.num);

              return (
                <div
                  key={day.num}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {day.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Day {day.num}</span>
                  </div>

                  {dayTemplates.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      No routine field activity scheduled
                    </div>
                  ) : (
                    dayTemplates.map((item) => {
                      const badge = getActivityBadge(item.activityType);
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-[11px] font-mono font-semibold text-slate-500">
                              {item.startTime} - {item.endTime}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          {item.gnDivision && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-teal-600" />
                              <span>{item.gnDivision}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>

          {/* Overrides & Special Leaves */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Approved Exceptions & Public Holidays for this Area</span>
            </h3>

            {overrides.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No overrides or leave records logged.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overrides.map((ov) => {
                  const badge = getActivityBadge(ov.activityType);
                  return (
                    <div
                      key={ov.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatDate(ov.overrideDate)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ov.title}
                        </div>
                        {ov.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {ov.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB B: MOTHER TRANSFERS */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Mother Transfer & Temporary Relocation Register
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracking mothers temporarily moving to maternal homes for delivery or permanently transferring across MOH areas
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Mother Name</th>
                  <th className="py-3 px-4">Origin Area</th>
                  <th className="py-3 px-4">Transfer Type</th>
                  <th className="py-3 px-4">Destination Area</th>
                  <th className="py-3 px-4 text-center">Expected Return</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {tr.motherName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {tr.phmAreaName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tr.transferType === 'TEMP_OUT'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {tr.transferType === 'TEMP_OUT' ? 'Temporarily Out' : 'Permanent Transfer'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {tr.destinationArea}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {tr.expectedReturnDate ? formatDate(tr.expectedReturnDate) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tr.status === 'ACTIVE'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : tr.status === 'RETURNED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tr.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {tr.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C: SMS REMINDER AUDIT LOGS */}
      {activeTab === 'SMS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Automated SMS Clinic Reminder Dispatches
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit logs from the Phase 3A Daily Edge Function (Notify.lk Gateway)
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Cron Scheduled: Daily 08:00 SLT</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Recipient Type</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Reminder Type</th>
                  <th className="py-3 px-4 text-center">Due Date</th>
                  <th className="py-3 px-4">Message Body</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Sent Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {smsLogs.map((sms) => (
                  <tr key={sms.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {sms.recipientType}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                      {sms.phone}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sms.reminderType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {formatDate(sms.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-sm truncate" title={sms.messageBody}>
                      {sms.messageBody}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sms.providerStatus === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {sms.providerStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                      {formatDateTime(sms.sentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
