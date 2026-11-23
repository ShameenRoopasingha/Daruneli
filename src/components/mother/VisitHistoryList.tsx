import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AntenatalVisit } from '@/src/db/motherRepo';
import { InlineVoicePlayer } from '../VoiceNoteRecorder';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

interface VisitHistoryListProps {
  visits: AntenatalVisit[];
}

function formatDisplayDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
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

export const VisitHistoryList: React.FC<VisitHistoryListProps> = ({ visits }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.visitHeaderRow}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>
            {t('mother.visitHistory', 'Antenatal Visit History')} ({visits.length})
          </Text>
        </View>
      </View>

      {visits.length === 0 ? (
        <View style={styles.emptyVisitsContainer}>
          <Text style={styles.emptyVisitsIcon}>📋</Text>
          <Text style={styles.emptyVisitsText}>
            {t('mother.noVisits', 'No antenatal visits recorded yet')}
          </Text>
        </View>
      ) : (
        visits.map((v) => {
          const dangerSigns = safeParseJson<string[]>(v.danger_signs_json, []);
          const supplements = safeParseJson<string[]>(v.supplements_json, []);
          const isHighBp = Boolean(
            (v.bp_systolic && v.bp_systolic >= 140) ||
            (v.bp_diastolic && v.bp_diastolic >= 90)
          );
          const isLowHb = Boolean(v.hemoglobin !== null && v.hemoglobin < 11.0);

          return (
            <View key={v.id} style={styles.visitItem}>
              <View style={styles.visitTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.visitDate}>{formatDisplayDate(v.visit_date)}</Text>
                  {v.poa_weeks && (
                    <Text style={styles.visitPoa}>• {v.poa_weeks.toFixed(1)} wks</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.visitBadge,
                    v.visit_type === 'CLINIC' ? styles.clinicBadge : styles.homeBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.visitBadgeText,
                      v.visit_type === 'CLINIC'
                        ? styles.clinicBadgeText
                        : styles.homeBadgeText,
                    ]}
                  >
                    {v.visit_type}
                  </Text>
                </View>
              </View>

              {/* Vitals metrics row */}
              <View style={styles.visitStatsRow}>
                <View style={styles.visitMetric}>
                  <Text style={styles.metricLabel}>BP (mmHg)</Text>
                  <Text style={[styles.metricValue, isHighBp ? styles.metricAlert : undefined]}>
                    {v.bp_systolic || '-'}/{v.bp_diastolic || '-'}
                  </Text>
                </View>
                <View style={styles.visitMetric}>
                  <Text style={styles.metricLabel}>SFH (cm)</Text>
                  <Text style={styles.metricValue}>
                    {v.sfh_cm ? `${v.sfh_cm} cm` : '-'}
                  </Text>
                </View>
                <View style={styles.visitMetric}>
                  <Text style={styles.metricLabel}>Weight</Text>
                  <Text style={styles.metricValue}>
                    {v.weight_kg ? `${v.weight_kg} kg` : '-'}
                  </Text>
                </View>
                <View style={styles.visitMetric}>
                  <Text style={styles.metricLabel}>Hb</Text>
                  <Text style={[styles.metricValue, isLowHb ? styles.metricAlert : undefined]}>
                    {v.hemoglobin ? `${v.hemoglobin}` : '-'}
                  </Text>
                </View>
              </View>

              {/* Voice Note Audio Player */}
              {v.voice_note_local_uri ? (
                <View style={styles.voiceNoteRow}>
                  <InlineVoicePlayer
                    uri={v.voice_note_local_uri}
                    durationSec={v.voice_note_duration_sec}
                  />
                </View>
              ) : null}

              {/* Danger signs warning */}
              {dangerSigns.length > 0 && (
                <View style={styles.dangerAlertBox}>
                  <Text style={styles.dangerAlertText}>
                    ⚠️ Danger Signs: {dangerSigns.join(', ')}
                  </Text>
                </View>
              )}

              {/* Supplements chips */}
              {supplements.length > 0 && (
                <View style={styles.supplementsRow}>
                  <Text style={styles.supplementsLabel}>Supplements:</Text>
                  <View style={styles.supplementsList}>
                    {supplements.map((s, idx) => (
                      <View key={idx} style={styles.supplementChip}>
                        <Text style={styles.supplementChipText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Midwife notes */}
              {v.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.visitNotes}>&quot;{v.notes}&quot;</Text>
                </View>
              ) : null}

              {/* Next Scheduled Visit */}
              {v.next_visit_date && (
                <View style={styles.nextVisitRow}>
                  <Text style={styles.nextVisitText}>
                    📅 Next checkup due:{' '}
                    <Text style={styles.nextVisitBold}>{formatDisplayDate(v.next_visit_date)}</Text>
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
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
  visitHeaderRow: {
    marginBottom: 12,
  },
  cardHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  emptyVisitsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyVisitsIcon: {
    fontSize: 32,
  },
  emptyVisitsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  visitItem: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  visitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  visitPoa: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  visitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  clinicBadge: {
    backgroundColor: COLORS.primaryLight,
  },
  homeBadge: {
    backgroundColor: '#F3E8FF',
  },
  visitBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  clinicBadgeText: {
    color: COLORS.primaryDark,
  },
  homeBadgeText: {
    color: '#7E22CE',
  },
  visitStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  visitMetric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  metricAlert: {
    color: COLORS.risk.red.accent,
  },
  voiceNoteRow: {
    marginBottom: 8,
  },
  dangerAlertBox: {
    backgroundColor: COLORS.risk.red.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
  },
  dangerAlertText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.risk.red.text,
  },
  supplementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  supplementsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  supplementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  supplementChip: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  supplementChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notesBox: {
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    marginBottom: 6,
  },
  visitNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  nextVisitRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderHairline,
  },
  nextVisitText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nextVisitBold: {
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
});
