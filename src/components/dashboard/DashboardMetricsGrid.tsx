import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AreaStats } from '@/src/db';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';

interface DashboardMetricsGridProps {
  stats: AreaStats | null;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({ stats }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.metricsGrid}>
      <View style={styles.metricCard}>
        <View style={[styles.metricAccentBar, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.metricLabel}>{t('dashboard.activeMothers', 'Active Mothers')}</Text>
        <Text style={[styles.metricValue, { color: COLORS.textPrimary }]}>
          {stats?.activeMothers ?? 0}
        </Text>
        <Text style={styles.metricSub}>Total registered: {stats?.totalMothers ?? 0}</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={[styles.metricAccentBar, { backgroundColor: COLORS.risk.red.accent }]} />
        <Text style={[styles.metricLabel, { color: COLORS.risk.red.text }]}>
          {t('dashboard.highRisk', 'High Risk (RED)')}
        </Text>
        <Text style={[styles.metricValue, { color: COLORS.risk.red.accent }]}>
          {stats?.redRisk ?? 0}
        </Text>
        <Text style={[styles.metricSub, { color: COLORS.risk.red.text }]}>Weekly visit tier</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={[styles.metricAccentBar, { backgroundColor: COLORS.risk.yellow.accent }]} />
        <Text style={[styles.metricLabel, { color: COLORS.risk.yellow.text }]}>
          {t('dashboard.overdueAlerts', 'Overdue Alerts')}
        </Text>
        <Text style={[styles.metricValue, { color: COLORS.risk.yellow.accent }]}>
          {(stats?.overdueVisits ?? 0) + (stats?.overdueVaccines ?? 0)}
        </Text>
        <Text style={styles.metricSub}>
          Visits: {stats?.overdueVisits ?? 0} • Vax: {stats?.overdueVaccines ?? 0}
        </Text>
      </View>

      <View style={styles.metricCard}>
        <View style={[styles.metricAccentBar, { backgroundColor: '#F97316' }]} />
        <Text style={[styles.metricLabel, { color: '#C2410C' }]}>
          {t('dashboard.growthFaltering', 'Growth Faltering')}
        </Text>
        <Text style={[styles.metricValue, { color: '#EA580C' }]}>
          {stats?.growthFalteringCount ?? 0}
        </Text>
        <Text style={[styles.metricSub, { color: '#9A3412' }]}>MAM / SAM tracked</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.card,
  },
  metricAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
});
