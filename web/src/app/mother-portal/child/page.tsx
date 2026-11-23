'use client';

import React, { useState } from 'react';
import {
  Baby,
  Syringe,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { useMotherPortal } from '@/lib/motherPortalI18n';
import { DEMO_MOTHER_PORTAL_DATA } from '@/lib/motherPortalService';

export default function MotherChildPage() {
  const { t } = useMotherPortal();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'VACCINES' | 'GROWTH'>('VACCINES');

  const children = DEMO_MOTHER_PORTAL_DATA.children;
  const currentChild = children[selectedChildIndex];

  // CHDR Weight-for-Age curve data formatted for Recharts
  const growthChartData = currentChild.growthRecords.map((r) => ({
    month: `${r.monthAge}m`,
    monthAge: r.monthAge,
    weight: r.weightKg,
    normalLower: 2.8 + r.monthAge * 0.5,
    normalUpper: 4.2 + r.monthAge * 0.65,
  }));

  const nextDueVaccines = currentChild.immunizations.filter((v) => v.status === 'NEXT_DUE');
  const completedVaccines = currentChild.immunizations.filter((v) => v.status === 'COMPLETED');
  const upcomingVaccines = currentChild.immunizations.filter((v) => v.status === 'UPCOMING');

  return (
    <div className="space-y-4 pt-1 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Baby className="w-5 h-5 text-teal-600" />
          <span>{t.baby.title}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.baby.subtitle}
        </p>
      </div>

      {/* Child Switcher Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {children.map((ch, idx) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setSelectedChildIndex(idx)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedChildIndex === idx
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>👶 {ch.fullName}</span>
            <span className="text-[10px] opacity-80">({ch.ageMonths}m)</span>
          </button>
        ))}

        {/* Unborn / Upcoming Baby Preview Chip */}
        <button
          type="button"
          onClick={() => alert('Newborn roadmap: Vaccines start immediately at birth with the BCG dose at hospital.')}
          className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 transition-all shrink-0 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Pregnancy (Baby Due Jan 2027)</span>
        </button>
      </div>

      {/* Child Hero Bio Card */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">
            National CHDR Record
          </span>
          <h2 className="text-lg font-black mt-0.5">{currentChild.fullName}</h2>
          <div className="flex items-center gap-3 mt-2 text-xs text-teal-100 font-semibold">
            <span>
              {t.baby.bornChildAge}: <strong>{currentChild.ageMonths} Months</strong>
            </span>
            <span>•</span>
            <span>
              {t.baby.birthWeight}: <strong>{currentChild.birthWeightKg} kg</strong>
            </span>
          </div>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-inner">
          👶
        </div>
      </div>

      {/* Segment Switcher: Vaccines vs Growth */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('VACCINES')}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'VACCINES'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Syringe className="w-4 h-4" />
          <span>EPI Vaccines ({completedVaccines.length}/{currentChild.immunizations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GROWTH')}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'GROWTH'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Growth Chart (CHDR)</span>
        </button>
      </div>

      {/* Tab 1: Vaccines Timeline */}
      {activeTab === 'VACCINES' && (
        <div className="space-y-3">
          {/* Next Due Highlight Card */}
          {nextDueVaccines.length > 0 && (
            <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t.baby.vaccineNextDue}</span>
                </span>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900 px-2 py-0.5 rounded-full">
                  Due: {nextDueVaccines[0].dueDate}
                </span>
              </div>
              <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">
                {nextDueVaccines[0].vaccineCode} • {nextDueVaccines[0].vaccineName}
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                Administered at the 18-month child welfare clinic by your Public Health Midwife.
              </p>
            </div>
          )}

          {/* Completed Vaccines Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.baby.vaccineCompleted}</span>
            </h3>

            <div className="space-y-2">
              {completedVaccines.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {v.vaccineCode}
                      </div>
                      <div className="text-[10px] text-slate-400">{v.vaccineName}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {v.dateAdministered}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Milestones */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>{t.baby.vaccineUpcoming}</span>
            </h3>

            <div className="space-y-2">
              {upcomingVaccines.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 text-xs opacity-75"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-300">
                      {v.vaccineCode}
                    </div>
                    <div className="text-[10px] text-slate-400">{v.vaccineName}</div>
                  </div>
                  <div className="text-right shrink-0 text-[10px] font-semibold text-slate-500">
                    Target: {v.targetAgeMonths} Months
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Growth Chart (Recharts) */}
      {activeTab === 'GROWTH' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {t.baby.growthChartTitle}
              </h3>
              <p className="text-[10px] text-slate-400">{t.baby.growthChartSub}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200">
              <Award className="w-3 h-3 text-emerald-600" />
              <span>Normal Band</span>
            </div>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis unit="kg" domain={[0, 14]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} kg`, 'Child Weight']}
                  labelFormatter={(lbl) => `Age: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <ReferenceArea y1={8} y2={12} fill="#10B981" fillOpacity={0.1} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#0F8B8D"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0F8B8D' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Reference Legend */}
          <div className="flex items-center justify-around pt-2 text-[10px] text-slate-500 font-medium border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Green: Appropriate Growth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              <span>Teal Line: {currentChild.fullName}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
