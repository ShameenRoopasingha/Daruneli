import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getAreaStats, seedDatabase, type AreaStats } from '@/src/db';
import { useAutoSync } from '@/src/sync';
import {
  aggregateH509Data,
  exportAndShareH509,
  printH509Directly,
  type H509ReportData,
} from '@/src/reports';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';
import { PhmWallCharts } from '@/src/components/charts';

const MONTH_OPTIONS = [
  { month: 1, label: 'Jan' },
  { month: 2, label: 'Feb' },
  { month: 3, label: 'Mar' },
  { month: 4, label: 'Apr' },
  { month: 5, label: 'May' },
  { month: 6, label: 'Jun' },
  { month: 7, label: 'Jul' },
  { month: 8, label: 'Aug' },
  { month: 9, label: 'Sep' },
  { month: 10, label: 'Oct' },
  { month: 11, label: 'Nov' },
  { month: 12, label: 'Dec' },
];

function formatDateTime(iso?: string | null): string {
  if (!iso) return 'Never synced';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export default function AreaScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const autoSync = useAutoSync();

  const [stats, setStats] = useState<AreaStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // H509 Report Month & Year state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [h509Data, setH509Data] = useState<H509ReportData | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, h509] = await Promise.all([
        getAreaStats(),
        aggregateH509Data({ year: selectedYear, month: selectedMonth }),
      ]);
      setStats(s);
      setH509Data(h509);
    } catch (e) {
      console.error('Error loading area report data:', e);
    }
  }, [selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    aggregateH509Data({ year: selectedYear, month: selectedMonth })
      .then(setH509Data)
      .catch(console.error);
  }, [selectedYear, selectedMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), autoSync.refreshStatus()]);
    setRefreshing(false);
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'si' ? 'en' : 'si';
    i18n.changeLanguage(nextLang);
  };

  const handleManualSync = async () => {
    const res = await autoSync.triggerSync();
    await loadData();
    if (!res.success && res.message.includes('Sign in')) {
      Alert.alert('Staff Sign-In Required', res.message, [
        { text: 'Continue Offline', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login' as any) },
      ]);
    } else {
      Alert.alert('Cloud Sync Result', res.message);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportAndShareH509({
        year: selectedYear,
        month: selectedMonth,
        phmAreaName: 'Kottawa North (PHM/MAH/01)',
        mohDivision: 'Maharagama',
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDirectPrint = async () => {
    if (!h509Data) return;
    try {
      setIsPrinting(true);
      await printH509Directly(h509Data);
    } catch (err: any) {
      Alert.alert('Print Failed', err?.message || 'Could not print report');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      t('area.resetDemo', 'Reset Demo Data'),
      t(
        'area.resetConfirm',
        'This will reset all records back to the default Sri Lankan PHM seed dataset. Continue?'
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await seedDatabase(true);
              await loadData();
              await autoSync.refreshStatus();
              Alert.alert('Done', 'Demo data has been reset successfully.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to reset data');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const totalPreg = (stats?.redRisk ?? 0) + (stats?.yellowRisk ?? 0) + (stats?.greenRisk ?? 0) || 1;
  const redPct = Math.round(((stats?.redRisk ?? 0) / totalPreg) * 100);
  const yellowPct = Math.round(((stats?.yellowRisk ?? 0) / totalPreg) * 100);
  const greenPct = Math.round(((stats?.greenRisk ?? 0) / totalPreg) * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* 1. TOP CONTROL BAR */}
      <View style={styles.topControlBar}>
        <View style={styles.phmAreaBadge}>
          <Text style={styles.phmAreaPin}>📍</Text>
          <Text style={styles.phmAreaText}>Kottawa North • PHM/MAH/01</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.langToggleBtn}
          onPress={toggleLanguage}
        >
          <Text style={styles.langToggleText}>
            🌐 {i18n.language === 'si' ? 'English' : 'සිංහල'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. CLOUD SYNC & DATA PERSISTENCE CARD */}
      <View style={styles.syncCard}>
        <View style={styles.syncCardHeader}>
          <View style={styles.syncIconCircle}>
            <Text style={styles.syncCardIcon}>☁️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncCardTitle}>Cloud Sync & Central Database</Text>
            <Text style={styles.syncCardSub}>
              {autoSync.isConfigured
                ? 'Connected to Supabase Central MOH Database'
                : 'Offline Demo Mode • Local SQLite Storage Active'}
            </Text>
          </View>
          <View
            style={[
              styles.connectionBadge,
              autoSync.isOnline ? styles.badgeOnline : styles.badgeOffline,
            ]}
          >
            <View
              style={[
                styles.connDot,
                { backgroundColor: autoSync.isOnline ? COLORS.risk.green.dot : COLORS.textTertiary },
              ]}
            />
            <Text
              style={[
                styles.connText,
                { color: autoSync.isOnline ? COLORS.risk.green.text : COLORS.textSecondary },
              ]}
            >
              {autoSync.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.syncStatsRow}>
          <View style={styles.syncStatBox}>
            <Text style={styles.syncStatLabel}>PENDING CHANGES</Text>
            <Text
              style={[
                styles.syncStatVal,
                autoSync.dirtyCount > 0 ? { color: COLORS.risk.yellow.accent } : { color: COLORS.risk.green.accent },
              ]}
            >
              {autoSync.dirtyCount} records
            </Text>
          </View>

          <View style={styles.syncStatBox}>
            <Text style={styles.syncStatLabel}>LAST SYNCHRONIZED</Text>
            <Text style={styles.syncStatVal}>
              {formatDateTime(autoSync.lastSyncedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.syncActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.syncNowBtn, autoSync.isSyncingNow && styles.btnDisabled]}
            disabled={autoSync.isSyncingNow}
            onPress={handleManualSync}
          >
            {autoSync.isSyncingNow ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <Text style={styles.syncNowBtnText}>⟳ Sync Now (Push & Pull)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.portalBtn}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.portalBtnText}>👤 Portal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. AREA CLINICAL RISK METRICS */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>
            {t('area.riskBreakdown', 'Pregnancy Risk Breakdown')}
          </Text>
        </View>

        {/* Stacked Progress Bar */}
        <View style={styles.stackedBar}>
          {redPct > 0 && <View style={[styles.barSegment, { flex: redPct, backgroundColor: COLORS.risk.red.dot }]} />}
          {yellowPct > 0 && <View style={[styles.barSegment, { flex: yellowPct, backgroundColor: COLORS.risk.yellow.dot }]} />}
          {greenPct > 0 && <View style={[styles.barSegment, { flex: greenPct, backgroundColor: COLORS.risk.green.dot }]} />}
        </View>

        <View style={styles.riskBreakdownGrid}>
          <View style={[styles.riskBox, styles.riskBoxRed]}>
            <Text style={[styles.riskBoxVal, { color: COLORS.risk.red.text }]}>{stats?.redRisk ?? 0}</Text>
            <Text style={[styles.riskBoxLabel, { color: COLORS.risk.red.text }]}>
              {t('risk.red', 'අධි')} ({redPct}%)
            </Text>
          </View>
          <View style={[styles.riskBox, styles.riskBoxYellow]}>
            <Text style={[styles.riskBoxVal, { color: COLORS.risk.yellow.text }]}>{stats?.yellowRisk ?? 0}</Text>
            <Text style={[styles.riskBoxLabel, { color: COLORS.risk.yellow.text }]}>
              {t('risk.yellow', 'මධ්‍යම')} ({yellowPct}%)
            </Text>
          </View>
          <View style={[styles.riskBox, styles.riskBoxGreen]}>
            <Text style={[styles.riskBoxVal, { color: COLORS.risk.green.text }]}>{stats?.greenRisk ?? 0}</Text>
            <Text style={[styles.riskBoxLabel, { color: COLORS.risk.green.text }]}>
              {t('risk.green', 'අඩු')} ({greenPct}%)
            </Text>
          </View>
        </View>
      </View>

      {/* 4. CHILD NUTRITION & VACCINATION COVERAGE */}
      <View style={styles.metricsTwoCol}>
        <View style={[styles.sectionCard, { flex: 1 }]}>
          <View style={styles.cardHeaderGroup}>
            <Text style={styles.smallCardTitle}>Child Nutrition</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Tracked</Text>
            <Text style={styles.statVal}>{stats?.totalChildren ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Faltering</Text>
            <Text style={[styles.statVal, { color: COLORS.risk.red.accent }]}>
              {stats?.growthFalteringCount ?? 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>MAM</Text>
            <Text style={[styles.statVal, { color: COLORS.risk.yellow.accent }]}>{stats?.mamCount ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>SAM</Text>
            <Text style={[styles.statVal, { color: COLORS.risk.red.text }]}>{stats?.samCount ?? 0}</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { flex: 1 }]}>
          <View style={styles.cardHeaderGroup}>
            <Text style={styles.smallCardTitle}>EPI Vaccines</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Coverage</Text>
            <Text style={[styles.statVal, { color: COLORS.risk.green.accent }]}>
              {stats?.vaccineCompletionPercent ?? 0}%
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Administered</Text>
            <Text style={styles.statVal}>{stats?.givenVaccines ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Doses</Text>
            <Text style={styles.statVal}>{stats?.totalVaccines ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Overdue</Text>
            <Text style={[styles.statVal, { color: COLORS.risk.red.accent }]}>
              {stats?.overdueVaccines ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {/* 4.5. OFFICIAL FHB PHM WALL CHARTS */}
      <PhmWallCharts
        stats={{
          totalFamilies: stats?.totalMothers ?? 6,
          totalPregnantMothers: stats?.activeMothers ?? 6,
          highRiskRedMothers: stats?.redRisk ?? 3,
          highRiskYellowMothers: stats?.yellowRisk ?? 2,
          normalGreenMothers: stats?.greenRisk ?? 1,
          totalInfants: 2,
          totalToddlers: Math.max(0, (stats?.totalChildren ?? 5) - 2),
          lowBirthWeightCount: 1,
          totalBirthsRecorded: stats?.totalChildren ?? 5,
          bcgCoveragePct: 100,
          penta3CoveragePct: 95,
          mmr1CoveragePct: 92,
          mmr2CoveragePct: Math.round(stats?.vaccineCompletionPercent ?? 88),
          gnNutritionBreakdown: [
            { gnDivision: 'Kottawa North', normalCount: Math.max(0, (stats?.totalChildren ?? 5) - (stats?.mamCount ?? 1) - (stats?.samCount ?? 0) - 2), mamCount: stats?.mamCount ?? 1, samCount: stats?.samCount ?? 0 },
            { gnDivision: 'Kottawa South', normalCount: 2, mamCount: 0, samCount: 0 },
            { gnDivision: 'Maharagama East', normalCount: 1, mamCount: 0, samCount: 0 },
          ],
        }}
      />

      {/* 5. FORM H509 MONTHLY SUMMARY REPORT & PDF EXPORT */}
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportIconCircle}>
            <Text style={styles.reportIcon}>📑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>
              {t('area.monthlyReport', 'Form H509: Monthly Summary Report')}
            </Text>
            <Text style={styles.reportSubtitle}>
              Official MOH Family Health Bureau Return • Form H-509
            </Text>
          </View>
        </View>

        {/* Month Selector Carousel */}
        <View style={styles.monthSelectorContainer}>
          <View style={styles.yearRow}>
            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y - 1)}
              style={styles.yearNavBtn}
            >
              <Text style={styles.yearNavText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y + 1)}
              style={styles.yearNavBtn}
            >
              <Text style={styles.yearNavText}>▶</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthChipsScroll}>
            {MONTH_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m.month}
                style={[
                  styles.monthChip,
                  selectedMonth === m.month && styles.monthChipActive,
                ]}
                onPress={() => setSelectedMonth(m.month)}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    selectedMonth === m.month && styles.monthChipTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Live Month Tally Table */}
        <View style={styles.reportTable}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLabel}>1. Active Pregnancies in Month</Text>
            <Text style={styles.tableColVal}>
              {h509Data?.section1_antenatal.activePregnantMothers ?? 0}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableColLabel}>2. New Antenatal Registrations</Text>
            <Text style={styles.tableColVal}>
              {h509Data?.section1_antenatal.newRegistrations ?? 0}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableColLabel}>3. High-Risk (RED) Case Count</Text>
            <Text style={[styles.tableColVal, { color: COLORS.risk.red.accent }]}>
              {h509Data?.section1_antenatal.riskBreakdown.red ?? 0}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableColLabel}>4. Total Deliveries in Month</Text>
            <Text style={styles.tableColVal}>
              {h509Data?.section2_deliveries.totalDeliveries ?? 0}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableColLabel}>5. Child Weighing Coverage</Text>
            <Text style={[styles.tableColVal, { color: COLORS.risk.green.accent }]}>
              {h509Data?.section3_childHealth.weighingCoveragePercent ?? 0}%
            </Text>
          </View>

          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableColLabel}>6. EPI Vaccines Administered</Text>
            <Text style={styles.tableColVal}>
              {h509Data?.section4_immunizations.totalDosesInMonth ?? 0}
            </Text>
          </View>
        </View>

        {/* PDF Export & Print Buttons */}
        <View style={styles.pdfActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.pdfExportBtn, isExportingPdf && styles.btnDisabled]}
            disabled={isExportingPdf}
            onPress={handleExportPdf}
          >
            {isExportingPdf ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <Text style={styles.pdfExportBtnText}>📄 Export & Share H509 PDF</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.pdfPrintBtn, isPrinting && styles.btnDisabled]}
            disabled={isPrinting}
            onPress={handleDirectPrint}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.pdfPrintBtnText}>🖨️ Print</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. RESET DEMO DATA ACTION */}
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isResetting}
        style={styles.resetBtn}
        onPress={handleResetData}
      >
        <Text style={styles.resetBtnText}>
          {isResetting ? 'Resetting dataset...' : `🔄 ${t('area.resetDemo', 'Reset Demo Dataset')}`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  phmAreaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    gap: 6,
    ...SHADOWS.card,
  },
  phmAreaPin: {
    fontSize: 12,
  },
  phmAreaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  langToggleBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  langToggleText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  syncCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  syncIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncCardIcon: {
    fontSize: 18,
  },
  syncCardTitle: {
    ...TYPOGRAPHY.h3,
  },
  syncCardSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  badgeOnline: {
    backgroundColor: COLORS.risk.green.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.green.border,
  },
  badgeOffline: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncStatsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 12,
    marginBottom: 12,
  },
  syncStatBox: {
    flex: 1,
  },
  syncStatLabel: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textTertiary,
  },
  syncStatVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  syncActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  syncNowBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  syncNowBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 13,
  },
  portalBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cardHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSubtle,
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  riskBreakdownGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  riskBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    borderWidth: 1,
  },
  riskBoxRed: {
    backgroundColor: COLORS.risk.red.bg,
    borderColor: COLORS.risk.red.border,
  },
  riskBoxYellow: {
    backgroundColor: COLORS.risk.yellow.bg,
    borderColor: COLORS.risk.yellow.border,
  },
  riskBoxGreen: {
    backgroundColor: COLORS.risk.green.bg,
    borderColor: COLORS.risk.green.border,
  },
  riskBoxVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  riskBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  metricsTwoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
    paddingBottom: 12,
  },
  reportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 18,
  },
  reportTitle: {
    ...TYPOGRAPHY.h3,
  },
  reportSubtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  monthSelectorContainer: {
    marginBottom: 14,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 10,
  },
  yearNavBtn: {
    padding: 6,
  },
  yearNavText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  yearText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  monthChipsScroll: {
    flexDirection: 'row',
  },
  monthChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthChipActive: {
    backgroundColor: COLORS.primary,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  monthChipTextActive: {
    color: COLORS.textWhite,
    fontWeight: '700',
  },
  reportTable: {
    gap: 2,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  tableColLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  tableColVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  pdfExportBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  pdfExportBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 13,
  },
  pdfPrintBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  pdfPrintBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  resetBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.card,
  },
  resetBtnText: {
    color: COLORS.risk.red.text,
    fontWeight: '700',
    fontSize: 13,
  },
});
