'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Volume2,
  ShieldCheck,
  Send,
  X,
  Activity,
  HeartPulse,
  UserCheck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getEscalationAlerts, getAreaSummaries, submitSupervisionDirective } from '@/lib/dataService';
import { EscalationAlert, PhmAreaSummary, ReviewStatus } from '@/lib/types';
import { formatDateTime, formatDate } from '@/lib/dateFormat';

export default function EscalationRadarPage() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<EscalationAlert[]>([]);
  const [areas, setAreas] = useState<PhmAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Slide-over drawer state
  const [activeAlert, setActiveAlert] = useState<EscalationAlert | null>(null);
  const [directiveNote, setDirectiveNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [alertList, areaList] = await Promise.all([
          getEscalationAlerts({
            areaId: selectedArea,
            category: selectedCategory,
            status: selectedStatus,
          }),
          getAreaSummaries(),
        ]);
        setAlerts(alertList);
        setAreas(areaList);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedArea, selectedCategory, selectedStatus]);

  const handleAction = async (status: ReviewStatus) => {
    if (!activeAlert) return;
    try {
      setSubmittingAction(true);
      await submitSupervisionDirective(
        activeAlert.id,
        directiveNote.trim() || `Supervisor marked as ${status}`,
        status,
        'MOH'
      );

      // Refresh list
      const updated = await getEscalationAlerts({
        areaId: selectedArea,
        category: selectedCategory,
        status: selectedStatus,
      });
      setAlerts(updated);

      const refreshedActive = updated.find((a) => a.id === activeAlert.id);
      if (refreshedActive) {
        setActiveAlert(refreshedActive);
      }
      setDirectiveNote('');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('escalation.title')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              Live Radar
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('escalation.subtitle')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
          <Filter className="w-4 h-4 text-teal-600" />
          <span>Filters:</span>
        </div>

        {/* Area Filter */}
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="ALL">{t('filter.all_areas')}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.code})
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="ALL">{t('filter.all_categories')}</option>
          <option value="HIGH_BP">Severe BP / Pre-Eclampsia</option>
          <option value="POSTNATAL_MEOWS">Postnatal MEOWS Trigger</option>
          <option value="REDUCED_FETAL_KICKS">Reduced Fetal Movements</option>
          <option value="OVERDUE_RED_RISK">Overdue RED-Risk Follow-up</option>
          <option value="CHILD_SAM">Severe Child Malnutrition (SAM)</option>
          <option value="GROWTH_FALTERING">Growth Faltering Flag</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="ALL">{t('filter.all_statuses')}</option>
          <option value="UNREVIEWED">Unreviewed Queue</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="FOLLOW_UP_REQUESTED">Follow-up Requested</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {/* Escalation Queue Cards */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Open Escalation Alerts
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              All high-risk maternal and child cases are currently stable or acknowledged.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => setActiveAlert(alert)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {alert.targetName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {alert.eligibleFamilyNo}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alert.status === 'UNREVIEWED'
                            ? 'bg-red-500 text-white animate-pulse'
                            : alert.status === 'FOLLOW_UP_REQUESTED'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {alert.status}
                      </span>
                      {alert.source === 'MOTHER_PORTAL' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                          📱 Self-Logged by Mother
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {alert.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-teal-600" />
                        {alert.phmAreaName} • GN: {alert.gnDivision}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(alert.detectedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:self-center shrink-0">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    {t('action.review')} ›
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-Over Patient Inspection Drawer */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            onClick={() => setActiveAlert(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 z-10 flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      activeAlert.severity === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {activeAlert.severity} PRIORITY
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeAlert.eligibleFamilyNo}
                  </span>
                  {activeAlert.source === 'MOTHER_PORTAL' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                      📱 Self-Logged by Mother
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {activeAlert.targetName}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeAlert.phmAreaName} • GN: {activeAlert.gnDivision}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Clinical Summary Banner */}
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                  Incident Alert
                </h3>
                <p className="text-xs text-rose-800 dark:text-rose-300 font-medium mt-1 leading-relaxed">
                  {activeAlert.details}
                </p>
              </div>

              {/* Vitals Grid */}
              {activeAlert.vitals && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-teal-600" />
                    <span>Latest Clinical Measurements</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {activeAlert.vitals.bp && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Blood Pressure</span>
                        <div className="text-sm font-extrabold text-rose-600 mt-0.5">{activeAlert.vitals.bp} mmHg</div>
                      </div>
                    )}
                    {activeAlert.vitals.pulse && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pulse Rate</span>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{activeAlert.vitals.pulse} bpm</div>
                      </div>
                    )}
                    {activeAlert.vitals.temp && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Temperature</span>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{activeAlert.vitals.temp} °C</div>
                      </div>
                    )}
                    {activeAlert.vitals.sfh && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">SFH</span>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{activeAlert.vitals.sfh} cm</div>
                      </div>
                    )}
                    {activeAlert.vitals.weightKg && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Weight</span>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{activeAlert.vitals.weightKg} kg</div>
                      </div>
                    )}
                    {activeAlert.vitals.urineAlbumin && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Albumin</span>
                        <div className="text-sm font-extrabold text-amber-600 mt-0.5">{activeAlert.vitals.urineAlbumin}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Danger Signs Chips */}
              {activeAlert.dangerSigns && activeAlert.dangerSigns.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Reported Danger Signs
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAlert.dangerSigns.map((ds) => (
                      <span
                        key={ds}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                      >
                        ⚠️ {ds}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation & Maps */}
              {activeAlert.gpsLat && activeAlert.gpsLng && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Home Location (GPS Navigation)
                  </h4>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeAlert.gpsLat},${activeAlert.gpsLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>{t('drawer.directions')} ({activeAlert.gpsLat.toFixed(4)}, {activeAlert.gpsLng.toFixed(4)})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Voice Note Audio Player */}
              {activeAlert.voiceNoteUrl && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Volume2 className="w-4 h-4 text-teal-600" />
                    <span>{t('drawer.voice_note')} ({activeAlert.voiceNoteDurationSec}s)</span>
                  </div>
                  <audio controls className="w-full h-9">
                    <source src={activeAlert.voiceNoteUrl} type="audio/mp4" />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* Supervision Notes Audit Trail */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Supervisor Directives History
                </h4>
                {activeAlert.supervisionNotes && activeAlert.supervisionNotes.length > 0 ? (
                  <div className="space-y-2">
                    {activeAlert.supervisionNotes.map((sn) => (
                      <div
                        key={sn.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-bold text-teal-700 dark:text-teal-400">{sn.authorName} ({sn.authorRole})</span>
                          <span>{formatDateTime(sn.createdAt)}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{sn.note}</p>
                        <div className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Status: {sn.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No supervisor notes logged yet.</p>
                )}
              </div>

              {/* Supervisor Action Box */}
              <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800">
                <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>{t('drawer.supervisor_action')}</span>
                </h4>

                <textarea
                  value={directiveNote}
                  onChange={(e) => setDirectiveNote(e.target.value)}
                  placeholder="Enter clinical directive or instructions for the field midwife..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleAction('ACKNOWLEDGED')}
                    className="py-2 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition-all text-center disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleAction('FOLLOW_UP_REQUESTED')}
                    className="py-2 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm transition-all text-center disabled:opacity-50"
                  >
                    Request Visit
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => handleAction('RESOLVED')}
                    className="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all text-center disabled:opacity-50"
                  >
                    Resolve Case
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
