'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  UserPlus,
  Plus,
  Edit2,
  Users,
  ShieldCheck,
  Phone,
  CheckCircle2,
  X,
  Send,
  Building,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getAreaSummaries } from '@/lib/dataService';
import { PhmAreaSummary } from '@/lib/types';
import { CURRENT_USER } from '@/lib/mockData';

export default function AreasDirectoryPage() {
  const { t } = useLanguage();
  const [areas, setAreas] = useState<PhmAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [isInvitePhmOpen, setIsInvitePhmOpen] = useState(false);
  const [selectedAreaForInvite, setSelectedAreaForInvite] = useState<string>('');

  // Form state for new area
  const [areaCode, setAreaCode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [gnDivisionsInput, setGnDivisionsInput] = useState('');

  // Form state for PHM invite
  const [phmName, setPhmName] = useState('');
  const [phmEmail, setPhmEmail] = useState('');
  const [phmPassword, setPhmPassword] = useState('');
  const [inviteResult, setInviteResult] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    async function loadAreas() {
      try {
        const list = await getAreaSummaries();
        setAreas(list);
        if (list.length > 0) setSelectedAreaForInvite(list[0].id);
      } finally {
        setLoading(false);
      }
    }
    loadAreas();
  }, []);

  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaCode || !areaName) return;

    const gns = gnDivisionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newArea: PhmAreaSummary = {
      id: `area_custom_${Date.now()}`,
      code: areaCode.trim(),
      name: areaName.trim(),
      mohDivision: 'Walasmulla MOH Division',
      gnDivisions: gns.length > 0 ? gns : ['General Division'],
      phmOfficerName: 'Vacant (Unassigned)',
      phmOfficerPhone: '-',
      activeMothers: 0,
      redRiskCount: 0,
      yellowRiskCount: 0,
      greenRiskCount: 0,
      activeChildren: 0,
      mamCount: 0,
      samCount: 0,
      growthFalteringCount: 0,
      overdueTasksCount: 0,
      overdueVaccinesCount: 0,
      lastSyncAt: new Date().toISOString(),
      syncHealth: 'HEALTHY',
    };

    setAreas((prev) => [...prev, newArea]);
    setIsAddAreaOpen(false);
    setAreaCode('');
    setAreaName('');
    setGnDivisionsInput('');
  };

  const handleInvitePhm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phmName || !phmEmail) return;

    try {
      const res = await fetch('/api/admin/create-phm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: phmName,
          email: phmEmail,
          password: phmPassword || 'DaruneliPHM@2026',
          phmAreaId: selectedAreaForInvite,
        }),
      });

      const json = await res.json();
      setInviteResult({ success: json.success, msg: json.message });

      if (json.success) {
        // Update local list
        setAreas((prev) =>
          prev.map((a) =>
            a.id === selectedAreaForInvite ? { ...a, phmOfficerName: `${phmName} (PHM)` } : a
          )
        );
      }
    } catch {
      // In demo mode or offline, simulate successful assignment
      setInviteResult({
        success: true,
        msg: `[Offline Demo Simulation]: User created for ${phmName} and assigned to area successfully.`,
      });
      setAreas((prev) =>
        prev.map((a) =>
          a.id === selectedAreaForInvite ? { ...a, phmOfficerName: `${phmName} (PHM)` } : a
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('nav.areas')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            MOH administrative divisions, Grama Niladhari (GN) coverage mapping, and assigned midwifery personnel
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {CURRENT_USER.role === 'MOH' && (
            <button
              type="button"
              onClick={() => setIsAddAreaOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-teal-600" />
              <span>Add PHM Area</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsInvitePhmOpen(true);
              setInviteResult(null);
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite / Assign PHM</span>
          </button>
        </div>
      </div>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {areas.map((area) => (
          <div
            key={area.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              {/* Header row */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {area.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {area.name}
                  </h3>
                  <p className="text-xs text-slate-400">{area.mohDivision}</p>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      area.syncHealth === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {area.syncHealth}
                  </span>
                </div>
              </div>

              {/* GN Divisions Chips */}
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Assigned GN Divisions
                </span>
                <div className="flex flex-wrap gap-1">
                  {area.gnDivisions.length > 0 ? (
                    area.gnDivisions.map((gn) => (
                      <span
                        key={gn}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                      >
                        📍 {gn}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">All division units</span>
                  )}
                </div>
              </div>
            </div>

            {/* PHM Staff & Metrics Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-slate-900 dark:text-white truncate">
                    {area.phmOfficerName}
                  </span>
                </div>
                {area.phmOfficerPhone !== '-' && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    {area.phmOfficerPhone}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Mothers</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {area.activeMothers}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30">
                  <span className="text-[10px] text-rose-500 block font-bold">RED Risk</span>
                  <span className="font-extrabold text-rose-600">
                    {area.redRiskCount}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Children</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {area.activeChildren}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal 1: Add PHM Area (MOH Role) */}
      {isAddAreaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Register New PHM Area
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAreaOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Area Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PHM-06"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Area Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Walasmulla Town"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Grama Niladhari (GN) Divisions (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Walasmulla Town, Bowala"
                  value={gnDivisionsInput}
                  onChange={(e) => setGnDivisionsInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAreaOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  Save Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Invite / Assign New PHM */}
      {isInvitePhmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Assign Field Midwife (PHM)
                </h3>
                <p className="text-xs text-slate-400">
                  Creates mobile app credentials and maps RLS area access
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInvitePhmOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteResult && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  inviteResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {inviteResult.msg}
              </div>
            )}

            <form onSubmit={handleInvitePhm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target PHM Area *
                </label>
                <select
                  value={selectedAreaForInvite}
                  onChange={(e) => setSelectedAreaForInvite(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Midwife Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. M. Jayasinghe"
                  value={phmName}
                  onChange={(e) => setPhmName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="phm.kottawa@health.gov.lk"
                  value={phmEmail}
                  onChange={(e) => setPhmEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Temporary Mobile App Password
                </label>
                <input
                  type="password"
                  placeholder="Leave empty for default (DaruneliPHM@2026)"
                  value={phmPassword}
                  onChange={(e) => setPhmPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvitePhmOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600 font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  Create & Assign Midwife
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
