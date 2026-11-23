import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getChildById,
  getGrowthRecords,
  getImmunizations,
  markVaccineGiven,
  type Child,
  type ChildGrowthRecord,
  type Immunization,
} from '@/src/db';
import { ChdrGrowthCharts, FentonPretermChart } from '@/src/components/charts';
import { calculateAgeMonths } from '@/src/engine/growthAnalyzer';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

export default function ChildProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [child, setChild] = useState<Child | null>(null);
  const [growthRecords, setGrowthRecords] = useState<ChildGrowthRecord[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [c, gr, imm] = await Promise.all([
        getChildById(id),
        getGrowthRecords(id),
        getImmunizations(id),
      ]);
      setChild(c);
      setGrowthRecords(gr);
      setImmunizations(imm);
    } catch (e) {
      console.error('Failed to load child profile:', e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleMarkVaccine = (vaxId: string, vaxName: string) => {
    const isSi = i18n.language === 'si';
    Alert.alert(
      isSi ? 'එන්නත ලබා දුන් බව තහවුරු කරන්න' : 'Confirm Vaccine Administration',
      isSi
        ? `${child?.full_name || 'දරුවා'} සඳහා ${vaxName} එන්නත අද දින ලබා දුන් බව සටහන් කිරීමට ඔබට අවශ්‍යද?`
        : `Are you sure you want to mark ${vaxName} as administered to ${child?.full_name || 'this child'} today?`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'තහවුරු කරන්න' : 'Confirm Given',
          style: 'default',
          onPress: async () => {
            try {
              await markVaccineGiven(vaxId);
              await loadData();
              Alert.alert(
                isSi ? 'එන්නත සටහන් විය' : 'Vaccine Administered',
                isSi
                  ? `${vaxName} එන්නත සාර්ථකව සටහන් කරන ලදි.`
                  : `${vaxName} has been marked as GIVEN today.`
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to update immunization status');
            }
          },
        },
      ]
    );
  };

  if (!child) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading Child CHDR Profile...</Text>
      </View>
    );
  }

  const dob = new Date(child.dob);
  const ageMonths = calculateAgeMonths(dob);
  const years = Math.floor(ageMonths / 12);
  const remainingMonths = ageMonths % 12;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. TOP HEADER & IDENTITY */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.childName}>
              {child.gender === 'M' ? '👦' : '👧'} {child.full_name}
            </Text>
            <Text style={styles.subText}>
              Mother: {child.mother_name || 'N/A'} • DOB: {child.dob}
            </Text>
            <Text style={styles.subText}>
              Age: {ageMonths}m ({years > 0 ? `${years}y ` : ''}{remainingMonths}m) • QR: {child.qr_token}
            </Text>
          </View>

          <View
            style={[
              styles.nutritionBadge,
              child.nutrition_status === 'SAM'
                ? styles.badgeSAM
                : child.nutrition_status === 'MAM'
                ? styles.badgeMAM
                : styles.badgeNormal,
            ]}
          >
            <Text
              style={[
                styles.nutritionText,
                child.nutrition_status === 'SAM'
                  ? styles.textSAM
                  : child.nutrition_status === 'MAM'
                  ? styles.textMAM
                  : styles.textNormal,
              ]}
            >
              {child.nutrition_status}
            </Text>
          </View>
        </View>

        <View style={styles.birthStatsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>BIRTH WEIGHT</Text>
            <Text style={styles.statVal}>{child.birth_weight_kg ?? '-'} kg</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GENDER</Text>
            <Text style={styles.statVal}>{child.gender === 'M' ? 'Male' : 'Female'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>VACCINES GIVEN</Text>
            <Text style={styles.statVal}>
              {immunizations.filter((i) => i.status === 'GIVEN').length}/{immunizations.length}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. GROWTH FALTERING ALERT BANNER */}
      {child.growth_faltering_flag === 1 && (
        <View style={styles.falteringBanner}>
          <View style={styles.falteringHeader}>
            <View style={styles.falteringDot} />
            <Text style={styles.falteringTitle}>
              {t('child.growthFaltering', 'GROWTH FALTERING ALERT')}
            </Text>
          </View>
          <Text style={styles.falteringMsg}>
            {t(
              'child.growthFalteringMsg',
              'Child weight has failed to increase across 2 consecutive monthly measurements. Immediate supplementary feeding (Thriposha) & pediatric review required.'
            )}
          </Text>
        </View>
      )}

      {/* 3. FENTON PRETERM GROWTH CHART (If born < 37 weeks) */}
      {child.gestational_age_at_birth_weeks && child.gestational_age_at_birth_weeks < 37 && (
        <FentonPretermChart
          gender={child.gender}
          birthGestationalWeeks={child.gestational_age_at_birth_weeks}
          dob={child.dob}
          childName={child.full_name}
          growthRecords={growthRecords}
        />
      )}

      {/* 4. WHO CHDR GROWTH CHARTS (Segmented WFA, HFA, WFH) */}
      <ChdrGrowthCharts
        gender={child.gender}
        childName={child.full_name}
        dob={child.dob}
        growthRecords={growthRecords}
      />

      {/* 4. INTERACTIVE EPI VACCINE CHECKLIST */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>
            {t('child.vaccineSchedule', 'EPI Immunization Schedule')}
          </Text>
        </View>

        {immunizations.length === 0 ? (
          <Text style={styles.emptyText}>No immunization records generated</Text>
        ) : (
          immunizations.map((imm) => {
            const isGiven = imm.status === 'GIVEN';
            const isOverdue = imm.status === 'OVERDUE';

            return (
              <View
                key={imm.id}
                style={[
                  styles.vaxItem,
                  isOverdue && styles.vaxItemOverdue,
                  isGiven && styles.vaxItemGiven,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.vaxTitleRow}>
                    <Text style={styles.vaxName}>{imm.vaccine_name}</Text>
                    <View
                      style={[
                        styles.vaxStatusBadge,
                        isGiven
                          ? styles.vaxBadgeGiven
                          : isOverdue
                          ? styles.vaxBadgeOverdue
                          : styles.vaxBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.vaxStatusText,
                          isGiven
                            ? styles.vaxTextGiven
                            : isOverdue
                            ? styles.vaxTextOverdue
                            : styles.vaxTextPending,
                        ]}
                      >
                        {imm.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.vaxDate}>
                    Scheduled: {imm.scheduled_date}
                    {imm.given_date ? ` • Given: ${imm.given_date}` : ''}
                  </Text>
                </View>

                {!isGiven && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.markGivenBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleMarkVaccine(imm.id, imm.vaccine_name)}
                  >
                    <Text style={styles.markGivenText}>✓ Given</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* 5. MONTHLY GROWTH & MILESTONE RECORDS */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>Growth & Developmental History</Text>
        </View>

        {growthRecords.length === 0 ? (
          <Text style={styles.emptyText}>No monthly growth records logged yet</Text>
        ) : (
          growthRecords.map((gr) => {
            let milestones: string[] = [];
            let supplements: string[] = [];
            try {
              milestones = JSON.parse(gr.milestones_json || '[]');
              supplements = JSON.parse(gr.supplements_json || '[]');
            } catch {}

            return (
              <View key={gr.id} style={styles.growthRow}>
                <View style={styles.growthTop}>
                  <Text style={styles.growthAge}>Age: {gr.age_months} months</Text>
                  <Text style={styles.growthDate}>{gr.recorded_date}</Text>
                </View>

                <View style={styles.growthMetrics}>
                  <Text style={styles.growthMetricText}>
                    Weight: <Text style={styles.bold}>{gr.weight_kg ?? '-'} kg</Text>
                  </Text>
                  <Text style={styles.growthMetricText}>
                    Height: <Text style={styles.bold}>{gr.height_cm ?? '-'} cm</Text>
                  </Text>
                </View>

                {milestones.length > 0 && (
                  <Text style={styles.milestoneText}>
                    🎯 Milestones: {milestones.join(', ')}
                  </Text>
                )}

                {supplements.length > 0 && (
                  <Text style={styles.supplementText}>
                    💊 Supplements: {supplements.join(', ')}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* 6. LOG GROWTH ACTION BUTTON */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.primaryLogBtn}
        onPress={() => router.push(`/child/log-growth/${child.id}` as any)}
      >
        <Text style={styles.primaryLogText}>+ {t('child.logGrowth', 'Log Monthly Growth & Milestones')}</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  childName: {
    ...TYPOGRAPHY.h2,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  nutritionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  badgeNormal: {
    backgroundColor: COLORS.nutrition.normal.bg,
    borderColor: COLORS.nutrition.normal.border,
  },
  badgeMAM: {
    backgroundColor: COLORS.nutrition.mam.bg,
    borderColor: COLORS.nutrition.mam.border,
  },
  badgeSAM: {
    backgroundColor: COLORS.nutrition.sam.bg,
    borderColor: COLORS.nutrition.sam.border,
  },
  nutritionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textNormal: {
    color: COLORS.nutrition.normal.text,
  },
  textMAM: {
    color: COLORS.nutrition.mam.text,
  },
  textSAM: {
    color: COLORS.nutrition.sam.text,
  },
  birthStatsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 10,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.overline,
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  falteringBanner: {
    backgroundColor: COLORS.risk.red.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  falteringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  falteringDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.risk.red.dot,
  },
  falteringTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.risk.red.text,
    letterSpacing: 0.5,
  },
  falteringMsg: {
    fontSize: 12,
    color: COLORS.risk.red.text,
    lineHeight: 18,
    fontWeight: '500',
  },
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
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  vaxItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  vaxItemOverdue: {
    backgroundColor: COLORS.risk.red.bg,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    marginVertical: 2,
  },
  vaxItemGiven: {
    opacity: 0.85,
  },
  vaxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaxName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  vaxStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
  },
  vaxBadgeGiven: {
    backgroundColor: COLORS.risk.green.bg,
  },
  vaxBadgeOverdue: {
    backgroundColor: COLORS.risk.red.bg,
  },
  vaxBadgePending: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  vaxStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  vaxTextGiven: {
    color: COLORS.risk.green.text,
  },
  vaxTextOverdue: {
    color: COLORS.risk.red.text,
  },
  vaxTextPending: {
    color: COLORS.textTertiary,
  },
  vaxDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  markGivenBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginLeft: 10,
    minHeight: 38,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGivenText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 11,
  },
  growthRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  growthTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  growthAge: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  growthDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  growthMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 2,
  },
  growthMetricText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  milestoneText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  supplementText: {
    fontSize: 11,
    color: COLORS.accentWhatsApp,
    fontWeight: '600',
    marginTop: 1,
  },
  primaryLogBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginTop: 6,
    ...SHADOWS.floating,
  },
  primaryLogText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 15,
  },
});
