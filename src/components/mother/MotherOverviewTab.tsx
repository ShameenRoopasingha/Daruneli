import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MotherWithPregnancy, Pregnancy, AntenatalVisit } from '@/src/db/motherRepo';
import { calculatePOA, formatPOA, formatEDD } from '@/src/engine/pregnancyCalc';
import { VisitHistoryList } from './VisitHistoryList';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

interface MotherOverviewTabProps {
  mother: MotherWithPregnancy;
  pregnancy: Pregnancy | null;
  visits: AntenatalVisit[];
  onPhoneCall: () => void;
  onWhatsApp: () => void;
  onLogVisit: () => void;
  onMarkDelivered: () => void;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export const MotherOverviewTab: React.FC<MotherOverviewTabProps> = ({
  mother,
  pregnancy,
  visits,
  onPhoneCall,
  onWhatsApp,
  onLogVisit,
  onMarkDelivered,
}) => {
  const { t } = useTranslation();

  const poa = pregnancy?.lrmp_date ? calculatePOA(new Date(pregnancy.lrmp_date)) : null;
  const effectiveRisk = pregnancy?.risk_level || mother.risk_level || 'GREEN';
  const riskTokens =
    effectiveRisk === 'RED'
      ? COLORS.risk.red
      : effectiveRisk === 'YELLOW'
      ? COLORS.risk.yellow
      : COLORS.risk.green;

  const riskReasons = safeParseJson<string[]>(pregnancy?.risk_factors_json || mother.risk_factors_json, []);
  const chronicConditions = safeParseJson<string[]>(mother.chronic_conditions_json, []);

  return (
    <>
      {/* 1. QUICK ACTIONS CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>{t('mother.quickActions', 'Field Actions & Contact')}</Text>
        </View>

        <View style={styles.actionsGrid}>
          {/* Phone Call */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionBtn, styles.callBtn]}
            onPress={onPhoneCall}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.callBtnText}>{t('dashboard.call', 'Call Phone')}</Text>
            <Text style={styles.actionSubtext}>{mother.phone || 'No phone'}</Text>
          </TouchableOpacity>

          {/* WhatsApp */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionBtn, styles.whatsappBtn]}
            onPress={onWhatsApp}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.whatsappBtnText}>{t('dashboard.whatsapp', 'WhatsApp')}</Text>
            <Text style={styles.actionSubtext}>{t('mother.reminder', 'Send Reminder')}</Text>
          </TouchableOpacity>

          {/* Log Antenatal Visit */}
          {pregnancy && pregnancy.status === 'ACTIVE' && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.logVisitBtn]}
              onPress={onLogVisit}
            >
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.logVisitBtnText}>{t('mother.newVisit', 'Log Visit')}</Text>
              <Text style={styles.actionSubtext}>{t('mother.clinicalCheck', 'Antenatal Check')}</Text>
            </TouchableOpacity>
          )}

          {/* Mark as Delivered */}
          {pregnancy && pregnancy.status === 'ACTIVE' && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.deliverBtn]}
              onPress={onMarkDelivered}
            >
              <Text style={styles.actionIcon}>👶</Text>
              <Text style={styles.deliverBtnText}>{t('mother.markDelivered', 'Birth / Deliver')}</Text>
              <Text style={styles.actionSubtext}>{t('mother.registerNewborn', 'Register Baby')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. PREGNANCY PROGRESS CARD */}
      {poa && pregnancy && pregnancy.status === 'ACTIVE' && (
        <View style={styles.card}>
          <View style={styles.cardHeaderGroup}>
            <View style={[styles.bulletDot, { backgroundColor: riskTokens.dot }]} />
            <Text style={styles.cardTitle}>
              {t('mother.gestationalProgress', 'Gestational Progress & EDD')}
            </Text>
          </View>

          <View style={styles.poaRow}>
            <View>
              <Text style={styles.cardLabel}>{t('mother.poa', 'Period of Amenorrhea (POA)')}</Text>
              <Text style={styles.poaText}>{formatPOA(poa)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardLabel}>{t('mother.edd', 'Expected Delivery (EDD)')}</Text>
              <Text style={styles.eddText}>{formatEDD(poa.edd)}</Text>
            </View>
          </View>

          {/* Progress Bar (1-40 Weeks) */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(Math.max(poa.progressPercent, 4), 100)}%`,
                  backgroundColor: riskTokens.dot,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressSub}>Week 1</Text>
            <View style={styles.trimesterPill}>
              <Text style={styles.trimesterText}>Trimester {poa.trimester}</Text>
            </View>
            <Text style={styles.progressSub}>Week 40</Text>
          </View>
        </View>
      )}

      {/* 3. CLINICAL RISK REASONS & OBSTETRIC HISTORY CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: riskTokens.dot }]} />
          <Text style={styles.cardTitle}>
            {t('mother.riskReasons', 'Risk Assessment & Obstetric History')}
          </Text>
        </View>

        {/* Explicit Bullet List of Triggered Risk Reasons */}
        {riskReasons.length > 0 ? (
          <View
            style={[
              styles.reasonsBox,
              { backgroundColor: riskTokens.bg, borderColor: riskTokens.border },
            ]}
          >
            <Text style={[styles.reasonsBoxTitle, { color: riskTokens.text }]}>
              ⚠️ {t('mother.triggeredRisks', 'Identified High-Risk & Miscarriage Factors:')}
            </Text>
            {riskReasons.map((reason, idx) => (
              <View key={idx} style={styles.reasonItem}>
                <Text style={[styles.reasonDot, { color: riskTokens.dot }]}>•</Text>
                <Text style={[styles.reasonText, { color: riskTokens.text }]}>{reason}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.normalBox}>
            <Text style={styles.normalText}>
              ✓ {t('mother.lowRiskNotice', 'Low risk pregnancy • Routine antenatal care scheduled')}
            </Text>
          </View>
        )}

        {/* Obstetric History Grid */}
        <View style={styles.obstetricGrid}>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.gravidaPara', 'GRAVIDA / PARA')}</Text>
            <Text style={styles.obsVal}>
              G{pregnancy?.gravida ?? 1} P{pregnancy?.para ?? 0}
            </Text>
          </View>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.prevMiscarriages', 'MISCARRIAGES')}</Text>
            <Text
              style={[
                styles.obsVal,
                mother.prev_miscarriages_count > 0 && styles.obsValAlert,
              ]}
            >
              {mother.prev_miscarriages_count}
            </Text>
          </View>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.prevStillbirths', 'STILLBIRTHS')}</Text>
            <Text
              style={[
                styles.obsVal,
                mother.prev_stillbirths_count > 0 && styles.obsValAlert,
              ]}
            >
              {mother.prev_stillbirths_count}
            </Text>
          </View>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.prevCSections', 'C-SECTIONS')}</Text>
            <Text style={styles.obsVal}>{mother.prev_c_sections_count}</Text>
          </View>
        </View>

        {/* Fertility Treatment Alert */}
        {mother.fertility_treatment_history === 1 && (
          <View style={styles.preciousNotice}>
            <Text style={styles.preciousNoticeText}>
              ✨ {t('mother.fertilityTreatment', 'Precious Pregnancy: History of Fertility Treatment / Subfertility Management')}
            </Text>
          </View>
        )}

        {/* Chronic Conditions */}
        {chronicConditions.length > 0 && (
          <View style={styles.chronicContainer}>
            <Text style={styles.chronicLabel}>
              {t('mother.chronicConditions', 'Chronic Medical Conditions')}:
            </Text>
            <View style={styles.chronicChipsRow}>
              {chronicConditions.map((cond, idx) => (
                <View key={idx} style={styles.chronicChip}>
                  <Text style={styles.chronicChipText}>{cond}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 4. ANTENATAL VISIT HISTORY */}
      <VisitHistoryList visits={visits} />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
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
    color: COLORS.textPrimary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  callBtnText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },
  whatsappBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  whatsappBtnText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 13,
  },
  logVisitBtn: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  logVisitBtnText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  deliverBtn: {
    backgroundColor: '#FDF4FF',
    borderColor: '#F0ABFC',
  },
  deliverBtnText: {
    color: '#A21CAF',
    fontWeight: '700',
    fontSize: 13,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  poaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  poaText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  eddText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSub: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  trimesterPill: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  trimesterText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  reasonsBox: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  reasonsBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  reasonDot: {
    fontSize: 12,
    lineHeight: 16,
  },
  reasonText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  normalBox: {
    backgroundColor: COLORS.risk.green.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.green.border,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 14,
  },
  normalText: {
    color: COLORS.risk.green.text,
    fontSize: 12,
    fontWeight: '600',
  },
  obstetricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  obsItem: {
    alignItems: 'center',
    flex: 1,
  },
  obsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  obsVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  obsValAlert: {
    color: COLORS.risk.red.accent,
  },
  preciousNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 10,
  },
  preciousNoticeText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
  },
  chronicContainer: {
    marginTop: 12,
  },
  chronicLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  chronicChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chronicChip: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  chronicChipText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
