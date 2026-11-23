import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Task } from '@/src/db';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';

interface OverdueAlertSectionProps {
  tasks: Task[];
  onViewProfile: (id: string, type: 'MOTHER' | 'CHILD') => void;
  onCompleteTask: (taskId: string, targetName?: string, taskNotes?: string) => void;
}

function formatDisplayDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export const OverdueAlertSection: React.FC<OverdueAlertSectionProps> = ({
  tasks,
  onViewProfile,
  onCompleteTask,
}) => {
  const { t } = useTranslation();

  if (tasks.length === 0) return null;

  return (
    <View style={styles.overdueSection}>
      <View style={styles.overdueHeaderRow}>
        <View style={styles.overdueBadgePill}>
          <View style={styles.alertPulseDot} />
          <Text style={styles.overdueBadgePillText}>
            {tasks.length} {t('dashboard.overdueAction', 'Overdue Follow-ups')}
          </Text>
        </View>
        <Text style={styles.overdueSubLabel}>Action Required</Text>
      </View>

      {tasks.map((ot) => (
        <View key={ot.id} style={styles.overdueTaskCard}>
          <View style={styles.overdueTaskTop}>
            <View style={styles.taskTypeBadge}>
              <Text style={styles.taskTypeText}>{ot.task_type.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.overdueDate}>
              {t('dashboard.due', 'නියමිත')}: {formatDisplayDate(ot.due_date)}
            </Text>
          </View>

          <Text style={styles.overdueTargetName}>{ot.target_name || 'Recipient'}</Text>
          {ot.notes ? <Text style={styles.overdueNotes}>{ot.notes}</Text> : null}

          <View style={styles.overdueActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.overdueActionBtn}
              onPress={() => onViewProfile(ot.target_id, ot.target_type)}
            >
              <Text style={styles.overdueActionBtnText}>
                {ot.target_type === 'MOTHER' ? 'View Profile' : 'View Child'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.overdueActionBtn, styles.completeBtn]}
              onPress={() => onCompleteTask(ot.id, ot.target_name, ot.notes)}
            >
              <Text style={styles.completeBtnText}>✓ Mark Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overdueSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    ...SHADOWS.card,
  },
  overdueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overdueBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.risk.red.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
  },
  alertPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.risk.red.dot,
  },
  overdueBadgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.risk.red.text,
  },
  overdueSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.risk.red.accent,
  },
  overdueTaskCard: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  overdueTaskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTypeBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  taskTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  overdueDate: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.risk.red.accent,
  },
  overdueTargetName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  overdueNotes: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  overdueActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  overdueActionBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    minHeight: 38,
    justifyContent: 'center',
  },
  overdueActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  completeBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  completeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
});
