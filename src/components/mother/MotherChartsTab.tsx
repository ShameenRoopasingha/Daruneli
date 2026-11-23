import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AntenatalVisit, Pregnancy } from '@/src/db/motherRepo';
import { SfhChart, MaternalWeightBmiChart } from '@/src/components/charts';
import { SvgLineChart, type DataPoint } from '@/src/components/SvgLineChart';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

interface MotherChartsTabProps {
  visits: AntenatalVisit[];
  motherName: string;
  pregnancy: Pregnancy | null;
  chartWidth: number;
  onOpenWheel: () => void;
}

export const MotherChartsTab: React.FC<MotherChartsTabProps> = ({
  visits,
  motherName,
  pregnancy,
  chartWidth,
  onOpenWheel,
}) => {
  const { t } = useTranslation();

  const bpData: DataPoint[] = useMemo(() => {
    const sorted = [...visits].reverse();
    return sorted
      .filter((v) => v.bp_systolic !== null && v.bp_diastolic !== null)
      .map((v) => ({
        label: v.poa_weeks ? `${v.poa_weeks}w` : v.visit_date.slice(5),
        value: v.bp_systolic || 0,
        secondaryValue: v.bp_diastolic || 0,
      }));
  }, [visits]);

  return (
    <>
      {/* Quick Launcher: Gestational Wheel Calculator */}
      <View style={styles.wheelLauncherCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.wheelLauncherTitle}>Gestational Age Wheel Tool</Text>
          <Text style={styles.wheelLauncherDesc}>
            Interactive circular 40-week gestation wheel with FHB milestones.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.wheelLauncherBtn}
          onPress={onOpenWheel}
        >
          <Text style={styles.wheelLauncherBtnText}>Open Wheel 🎡</Text>
        </TouchableOpacity>
      </View>

      {/* 1. Symphysis-Fundal Height (SFH) Standardized Chart */}
      <SfhChart visits={visits} motherName={motherName} />

      {/* 2. Maternal Weight Gain & BMI Corridor Chart */}
      <MaternalWeightBmiChart
        bookingWeightKg={pregnancy?.booking_weight_kg}
        bookingHeightCm={pregnancy?.booking_height_cm}
        bookingBmi={pregnancy?.booking_bmi}
        visits={visits}
      />

      {/* 3. Blood Pressure Trend Chart */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.risk.red.accent }]} />
          <Text style={styles.cardTitle}>Blood Pressure Trend (mmHg)</Text>
        </View>
        <SvgLineChart
          data={bpData}
          title={t('mother.bpTrend', 'Blood Pressure Tracking')}
          primaryColor={COLORS.risk.red.accent}
          secondaryColor={COLORS.accentBlue}
          primaryLegend="Systolic"
          secondaryLegend="Diastolic"
          referenceLine={{ value: 140, label: 'Cutoff 140', color: COLORS.risk.red.dot }}
          height={180}
          width={chartWidth}
        />
      </View>
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
  wheelLauncherCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    ...SHADOWS.card,
  },
  wheelLauncherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  wheelLauncherDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingRight: 8,
  },
  wheelLauncherBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelLauncherBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 12,
  },
});
