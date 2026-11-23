'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Phone,
} from 'lucide-react';
import { useMotherPortal } from '@/lib/motherPortalI18n';
import { MotherPortalData } from '@/lib/motherPortalService';
import { formatDate } from '@/lib/dateFormat';

export default function MotherKicksPage() {
  const router = useRouter();
  const { t } = useMotherPortal();
  const [kickCount, setKickCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isWorried, setIsWorried] = useState(false);
  const [phmPhone, setPhmPhone] = useState('0714567890');
  const [history, setHistory] = useState<MotherPortalData['kickLogs']>([]);

  const todayDmy = formatDate(new Date());

  // Load kick history from server
  useEffect(() => {
    let isMounted = true;
    async function loadKickHistory() {
      try {
        const res = await fetch('/api/mother-portal/me');
        if (res.status === 401) {
          router.push('/mother-portal/login');
          return;
        }
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          setHistory(json.data.kickLogs || []);
          if (json.data.phmContact?.phone) {
            setPhmPhone(json.data.phmContact.phone);
          }
        }
      } catch (err) {
        console.error('Failed to load kick logs:', err);
      }
    }
    loadKickHistory();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load active session from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('daruneli_active_kick_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayDmy) {
          setKickCount(parsed.count || 0);
          setStartTime(parsed.startTime || null);
          setIsCompleted(parsed.count >= 10);
        }
      } catch {}
    }
  }, [todayDmy]);

  // Elapsed timer ticker
  useEffect(() => {
    if (!startTime || isCompleted) return;
    const interval = setInterval(() => {
      const diffMin = Math.floor((Date.now() - startTime) / (1000 * 60));
      setElapsedMinutes(diffMin);
    }, 15000);

    const initialDiff = Math.floor((Date.now() - startTime) / (1000 * 60));
    setElapsedMinutes(initialDiff);

    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  // Persist session to localStorage
  const saveSession = (count: number, start: number | null) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      'daruneli_active_kick_session',
      JSON.stringify({
        date: todayDmy,
        count,
        startTime: start,
        completed: count >= 10,
      })
    );
  };

  const handleKickTap = () => {
    if (isCompleted) return;

    const now = Date.now();
    const effectiveStart = startTime || now;
    if (!startTime) {
      setStartTime(effectiveStart);
    }

    const next = kickCount + 1;
    setKickCount(next);

    if (next >= 10) {
      setIsCompleted(true);
      const totalDuration = Math.max(1, Math.floor((now - effectiveStart) / (1000 * 60)));
      setElapsedMinutes(totalDuration);

      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const startD = new Date(effectiveStart);
      const startStr = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;

      const newEntry = {
        id: `kick_${Date.now()}`,
        logDate: todayDmy,
        startTime: startStr,
        tenthKickTime: timeStr,
        kickCount: 10,
        durationMinutes: totalDuration,
        reducedMovementFlag: false,
        source: 'MOTHER_PORTAL' as const,
      };

      setHistory((prev) => [newEntry, ...prev.filter((item) => item.logDate !== todayDmy)]);

      // Sync completed kick record to backend API
      fetch('/api/mother-portal/kicks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: todayDmy,
          startTime: startStr,
          tenthKickTime: timeStr,
          kickCount: 10,
          durationMinutes: totalDuration,
          reducedMovementFlag: false,
        }),
      }).catch((e) => console.error('Failed to sync kick log to backend:', e));
    }

    saveSession(next, effectiveStart);
  };

  const handleUndo = () => {
    if (kickCount <= 0) return;
    const next = kickCount - 1;
    setKickCount(next);
    setIsCompleted(false);
    saveSession(next, startTime);
  };

  const handleReset = () => {
    if (window.confirm('Reset today&apos;s kick counter?')) {
      setKickCount(0);
      setStartTime(null);
      setElapsedMinutes(0);
      setIsCompleted(false);
      setIsWorried(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('daruneli_active_kick_session');
      }
    }
  };

  const handleReportReducedKicks = () => {
    setIsWorried(true);
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const alertEntry = {
      id: `kick_alert_${Date.now()}`,
      logDate: todayDmy,
      startTime: '09:00',
      tenthKickTime: timeStr,
      kickCount: kickCount,
      durationMinutes: elapsedMinutes || 720,
      reducedMovementFlag: true,
      source: 'MOTHER_PORTAL' as const,
    };

    setHistory((prev) => [alertEntry, ...prev.filter((item) => item.logDate !== todayDmy)]);

    // Sync reduced kicks alert record to backend API
    fetch('/api/mother-portal/kicks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logDate: todayDmy,
        startTime: '09:00',
        tenthKickTime: timeStr,
        kickCount: kickCount,
        durationMinutes: elapsedMinutes || 720,
        reducedMovementFlag: true,
      }),
    }).catch((e) => console.error('Failed to sync kick alert to backend:', e));
  };

  return (
    <div className="space-y-4 pt-1 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-teal-600" />
          <span>{t.kicks.title}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.kicks.subtitle}
        </p>
      </div>

      {/* Info Pill */}
      <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 flex items-center gap-2 font-medium">
        <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
        <span>{t.kicks.infoPill}</span>
      </div>

      {/* Urgent Warning Banner if Reduced Movements */}
      {isWorried && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500 text-rose-900 dark:text-rose-100 space-y-2 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 font-black text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{t.kicks.worriedTitle}</span>
          </div>
          <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-200 font-medium">
            {t.kicks.worriedSub}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <a
              href="tel:1990"
              className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs text-center shadow-sm"
            >
              Call 1990 Ambulance
            </a>
            <a
              href={`tel:${phmPhone}`}
              className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-300 text-rose-800 dark:text-rose-200 font-bold text-xs text-center flex items-center justify-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call PHM</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Counter Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col items-center text-center space-y-4">
        {/* Elapsed Timer / Status */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4 text-teal-600" />
          <span>
            {t.kicks.elapsed}:{' '}
            <strong className="text-slate-900 dark:text-white">
              {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m
            </strong>
          </span>
        </div>

        {/* 160x160 Big Pulsing Circular Button */}
        <div className="relative">
          <button
            type="button"
            onClick={handleKickTap}
            disabled={isCompleted}
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 touch-manipulation select-none ${
              isCompleted
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 text-white shadow-teal-600/30 hover:scale-105 active:ring-8 active:ring-teal-200 dark:active:ring-teal-900'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-12 h-12 text-white mb-1" />
            ) : (
              <span className="text-3xl mb-1">🦶</span>
            )}
            <span className="text-2xl font-black tracking-tight">
              {kickCount} / 10
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-0.5">
              {isCompleted ? 'Complete' : t.kicks.tapButton}
            </span>
          </button>
        </div>

        {/* 10 Milestone Indicator Dots */}
        <div className="w-full max-w-xs flex justify-between gap-1.5 px-2">
          {Array.from({ length: 10 }).map((_, idx) => {
            const filled = idx < kickCount;
            return (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  filled
                    ? 'bg-gradient-to-r from-amber-400 to-teal-500 scale-y-125 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Success Banner when 10 reached */}
        {isCompleted && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs text-center animate-in fade-in duration-300">
            <div className="font-black text-sm">{t.kicks.completedTitle}</div>
            <p className="text-[11px] mt-0.5">{t.kicks.completedSub}</p>
          </div>
        )}

        {/* Counter Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {kickCount > 0 && !isCompleted && (
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.kicks.undo}</span>
            </button>
          )}

          {kickCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline"
            >
              {t.kicks.reset}
            </button>
          )}
        </div>

        {/* "Worried / Fewer than 10 kicks" trigger */}
        {!isCompleted && (
          <button
            type="button"
            onClick={handleReportReducedKicks}
            className="w-full mt-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-50 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{t.kicks.worriedBtn}</span>
          </button>
        )}
      </div>

      {/* 7-Day History Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>{t.kicks.historyTitle}</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {history.slice(0, 7).map((log) => {
            const isReduced = log.reducedMovementFlag;
            const hours = Math.floor(log.durationMinutes / 60);
            const mins = log.durationMinutes % 60;

            return (
              <div
                key={log.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>{log.logDate}</span>
                    {log.source === 'MOTHER_PORTAL' && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                        Self-Logged
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {log.startTime} → {log.tenthKickTime}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-black ${
                      isReduced
                        ? 'text-rose-600'
                        : 'text-teal-700 dark:text-teal-400'
                    }`}
                  >
                    {log.kickCount} kicks
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {hours > 0 ? `${hours}h ` : ''}
                    {mins}m
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
