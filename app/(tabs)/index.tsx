import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getAreaStats,
  getTodaysTasks,
  getAllMothers,
  completeTask,
  type AreaStats,
  type Task,
  type MotherWithPregnancy,
} from '@/src/db';
import { RiskBadge } from '@/src/components/RiskBadge';
import { useAutoSync } from '@/src/sync';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';
import { GestationalWheelTool } from '@/src/components/charts';
import {
  getScheduleTemplates,
  getOverridesForRange,
} from '@/src/db/repositories/scheduleRepo';
import {
  resolveDayPlan,
  type ResolvedDayPlan,
} from '@/src/engine/scheduleEngine';

export default function DashboardScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const autoSync = useAutoSync();

  const [stats, setStats] = useState<AreaStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [redMothers, setRedMothers] = useState<MotherWithPregnancy[]>([]);
  const [todayPlan, setTodayPlan] = useState<ResolvedDayPlan | null>(null);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [areaStats, todaysTasks, allMothers, allTemplates, todayOverrides] = await Promise.all([
        getAreaStats(),
        getTodaysTasks(),
        getAllMothers(),
        getScheduleTemplates(),
        getOverridesForRange(todayStr, todayStr),
      ]);

      setStats(areaStats);
      setTasks(todaysTasks);
      setRedMothers(allMothers.filter((m) => m.risk_level === 'RED'));
      setTodayPlan(resolveDayPlan(todayStr, allTemplates, todayOverrides));
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No phone number available for this contact.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Call Failed', `Could not initiate call to ${phone}`);
    });
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No phone number recorded.');
      return;
    }
    const cleanPhone = phone.replace(/^0/, '+94'); // Sri Lanka country code
    const isSinhala = i18n.language === 'si';
    const message = isSinhala
      ? `ආයුබෝවන් ${name || 'මව'}, මම ඔබගේ PHM මහත්මියයි. කරුණාකර ඔබගේ නියමිත පරීක්ෂාව සඳහා සායනයට පැමිණෙන්න හෝ නිවසේ රැඳී සිටින්න. ස්තූතියි.`
      : `Ayubowan ${name || 'Mother'}, this is your Public Health Midwife (PHM). Please remember your scheduled health checkup. Thank you.`;

    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`).catch(() => {
        Alert.alert('Message Failed', 'Could not open WhatsApp or SMS app.');
      });
    });
  };

  const handleCompleteTask = (taskId: string, targetName?: string, taskNotes?: string) => {
    const isSi = i18n.language === 'si';
    const patientStr = targetName ? ` (${targetName})` : '';
    Alert.alert(
      isSi ? 'කාර්යය සම්පූර්ණ කළ බව තහවුරු කරන්න' : 'Confirm Task Completion',
      isSi
        ? `${targetName || 'මෙම රෝගියා'} සඳහා වූ සායනික කාර්යය සම්පූර්ණ කළ බව සටහන් කිරීමට ඔබට අවශ්‍යද?${taskNotes ? `\n\nවිස්තරය: ${taskNotes}` : ''}`
        : `Are you sure you want to mark this clinical checkup${patientStr} as completed?${taskNotes ? `\n\nDetails: ${taskNotes}` : ''}`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'සම්පූර්ණයි' : 'Mark Completed',
          style: 'default',
          onPress: async () => {
            try {
              await completeTask(taskId);
              await loadData();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to complete task');
            }
          },
        },
      ]
    );
  };

  const overdueTasks = tasks.filter((task) => task.status === 'OVERDUE');
  const todayUpcomingTasks = tasks.filter((task) => task.status !== 'OVERDUE');

  // Group today's tasks by GN Division
  const tasksByGN: Record<string, Task[]> = {};
  todayUpcomingTasks.forEach((task) => {
    const gn = task.gn_division || 'General Area';
    if (!tasksByGN[gn]) tasksByGN[gn] = [];
    tasksByGN[gn].push(task);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* 0. SYNC & CONNECTIVITY STATUS PILL */}
      <View style={styles.syncBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.syncPill, autoSync.isOnline ? styles.syncOnline : styles.syncOffline]}
          onPress={async () => {
            const res = await autoSync.triggerSync();
            if (!res.success && res.message.includes('Sign in')) {
              Alert.alert('Staff Sign-In Required', res.message, [
                { text: 'Continue Offline', style: 'cancel' },
                { text: 'Sign In', onPress: () => router.push('/login' as any) },
              ]);
            } else {
              Alert.alert('Cloud Sync', res.message);
            }
          }}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: autoSync.isOnline ? COLORS.risk.green.dot : COLORS.textTertiary },
            ]}
          />
          <Text style={styles.syncStatusText}>
            {autoSync.isOnline ? 'Cloud Synced' : 'Offline Mode'}
          </Text>
          {autoSync.dirtyCount > 0 ? (
            <View style={styles.dirtyBadge}>
              <Text style={styles.dirtyBadgeText}>{autoSync.dirtyCount} pending</Text>
            </View>
          ) : (
            <Text style={styles.syncSyncedText}>• Up to date</Text>
          )}
          <Text style={styles.syncActionIcon}>
            {autoSync.isSyncingNow ? ' ⏳' : ' ⟳'}
          </Text>
        </TouchableOpacity>

        <View style={styles.syncRightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.wheelPill}
            onPress={() => setShowWheelModal(true)}
          >
            <Text style={styles.wheelPillText}>🎡 Wheel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.loginPill}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.loginPillText}>Portal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 0.5 TODAY'S ADVANCE PROGRAMME / TIMETABLE BANNER */}
      {todayPlan && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.todayTimetableBanner, todayPlan.is_override && styles.todayTimetableBannerOverride]}
          onPress={() => router.push('/(tabs)/schedule' as any)}
        >
          <View style={styles.timetableBannerLeft}>
            <Text style={styles.timetableIcon}>
              {todayPlan.activity_type === 'ANC_CLINIC'
                ? '🤰'
                : todayPlan.activity_type === 'CWC_CLINIC'
                ? '👶'
                : todayPlan.activity_type === 'HOME_VISIT'
                ? '🏡'
                : todayPlan.activity_type === 'MOH_OFFICE'
                ? '🏢'
                : todayPlan.activity_type === 'HOLIDAY'
                ? '🌕'
                : todayPlan.activity_type === 'LEAVE'
                ? '🏖️'
                : '📋'}
            </Text>
            <View style={styles.timetableInfo}>
              <View style={styles.timetableTagRow}>
                <Text style={styles.timetableTag}>
                  {i18n.language === 'si' ? 'අද දින සැලසුම (Advance Programme)' : "Today's Schedule"}
                </Text>
                {todayPlan.is_override && (
                  <View style={styles.timetableModifiedBadge}>
                    <Text style={styles.timetableModifiedText}>
                      {i18n.language === 'si' ? 'වෙනස් කළ' : 'Modified'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.timetableTitle} numberOfLines={1}>
                {todayPlan.title}
              </Text>
              <Text style={styles.timetableTime}>
                ⏰ {todayPlan.start_time} - {todayPlan.end_time}
                {todayPlan.gn_division ? ` • 📍 ${todayPlan.gn_division}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.timetableArrowContainer}>
            <Text style={styles.timetableArrowText}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 1. TOP METRIC CARDS */}
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

      {/* 2. OVERDUE / MISSED SECTION */}
      {overdueTasks.length > 0 && (
        <View style={styles.overdueSection}>
          <View style={styles.overdueHeaderRow}>
            <View style={styles.overdueBadgePill}>
              <View style={styles.alertPulseDot} />
              <Text style={styles.overdueBadgePillText}>
                {overdueTasks.length} {t('dashboard.overdueAction', 'Overdue Follow-ups')}
              </Text>
            </View>
            <Text style={styles.overdueSubLabel}>Action Required</Text>
          </View>

          {overdueTasks.map((ot) => (
            <View key={ot.id} style={styles.overdueTaskCard}>
              <View style={styles.overdueTaskTop}>
                <View style={styles.taskTypeBadge}>
                  <Text style={styles.taskTypeText}>{ot.task_type.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.overdueDate}>Due: {ot.due_date}</Text>
              </View>

              <Text style={styles.overdueTargetName}>{ot.target_name || 'Recipient'}</Text>
              {ot.notes ? <Text style={styles.overdueNotes}>{ot.notes}</Text> : null}

              <View style={styles.overdueActionsRow}>
                {ot.target_type === 'MOTHER' ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.overdueActionBtn}
                    onPress={() => router.push(`/mother/${ot.target_id}` as any)}
                  >
                    <Text style={styles.overdueActionBtnText}>View Profile</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.overdueActionBtn}
                    onPress={() => router.push(`/child/${ot.target_id}` as any)}
                  >
                    <Text style={styles.overdueActionBtnText}>View Child</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.overdueActionBtn, styles.completeBtn]}
                  onPress={() => handleCompleteTask(ot.id, ot.target_name, ot.notes)}
                >
                  <Text style={styles.completeBtnText}>✓ Mark Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 3. HIGH-RISK (RED-TAG) WATCHLIST */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <View style={[styles.sectionBulletDot, { backgroundColor: COLORS.risk.red.dot }]} />
            <Text style={styles.sectionTitle}>
              {t('dashboard.redWatchlist', 'High-Risk (RED-Tag) Watchlist')}
            </Text>
          </View>
          <View style={styles.badgeSmall}>
            <Text style={styles.badgeSmallText}>{redMothers.length}</Text>
          </View>
        </View>

        {redMothers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No high-risk mothers currently flagged</Text>
          </View>
        ) : (
          redMothers.map((mother) => {
            let riskFactors: string[] = [];
            try {
              riskFactors = JSON.parse((mother as any).preg_risk_factors || '[]');
            } catch {
              riskFactors = [];
            }

            return (
              <View key={mother.id} style={styles.redWatchCard}>
                <View style={styles.redCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.motherName}>{mother.full_name}</Text>
                    <Text style={styles.motherInfo}>
                      NIC: {mother.nic || 'N/A'} • {mother.gn_division || 'Unassigned'}
                    </Text>
                  </View>
                  <RiskBadge level="RED" score={mother.risk_score} />
                </View>

                {/* Risk Reasons Chips */}
                {riskFactors.length > 0 && (
                  <View style={styles.reasonsList}>
                    {riskFactors.map((rf, idx) => (
                      <View key={idx} style={styles.reasonChip}>
                        <Text style={styles.reasonText}>• {rf}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons: 1-Tap Call, WhatsApp, Log Visit */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => handleCall(mother.phone)}
                  >
                    <Text style={styles.callBtnText}>📞 {t('dashboard.call', 'Call')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.whatsappBtn]}
                    onPress={() => handleWhatsApp(mother.phone, mother.full_name)}
                  >
                    <Text style={styles.whatsappBtnText}>💬 {t('dashboard.whatsapp', 'WhatsApp')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.visitBtn]}
                    onPress={() => {
                      if (mother.pregnancy_id) {
                        router.push(`/mother/visit/${mother.pregnancy_id}` as any);
                      } else {
                        router.push(`/mother/${mother.id}` as any);
                      }
                    }}
                  >
                    <Text style={styles.visitBtnText}>📝 {t('dashboard.logVisit', 'Log Visit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 4. TODAY'S SCHEDULE (Grouped by GN Division) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <View style={[styles.sectionBulletDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.sectionTitle}>
              {t('dashboard.todaySchedule', "Today's Schedule & Visits")}
            </Text>
          </View>
          <Text style={styles.scheduleTotalSub}>
            {todayUpcomingTasks.length} {todayUpcomingTasks.length === 1 ? 'task' : 'tasks'}
          </Text>
        </View>

        {Object.keys(tasksByGN).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {t('dashboard.noTasks', 'No scheduled visits remaining for today')}
            </Text>
          </View>
        ) : (
          Object.entries(tasksByGN).map(([gnDivision, divisionTasks]) => (
            <View key={gnDivision} style={styles.gnGroup}>
              <View style={styles.gnHeader}>
                <View style={styles.gnTitleRow}>
                  <Text style={styles.gnPin}>📍</Text>
                  <Text style={styles.gnTitle}>GN {gnDivision}</Text>
                </View>
                <View style={styles.gnCountBadge}>
                  <Text style={styles.gnCountText}>{divisionTasks.length}</Text>
                </View>
              </View>

              {divisionTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.taskTargetName}>{task.target_name}</Text>
                    <Text style={styles.taskDesc}>{task.notes || task.task_type.replace(/_/g, ' ')}</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.doneBtn}
                    onPress={() => handleCompleteTask(task.id, task.target_name, task.notes)}
                  >
                    <Text style={styles.doneBtnText}>✓ Done</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </View>

      {/* GESTATIONAL WHEEL MODAL */}
      <GestationalWheelTool
        visible={showWheelModal}
        isModal={true}
        onClose={() => setShowWheelModal(false)}
      />
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
  syncBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 8,
    flexShrink: 1,
  },
  syncOnline: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  syncOffline: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.borderSubtle,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dirtyBadge: {
    backgroundColor: COLORS.risk.yellow.bg,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.risk.yellow.border,
  },
  dirtyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.risk.yellow.text,
  },
  syncSyncedText: {
    fontSize: 11,
    color: COLORS.risk.green.accent,
    fontWeight: '600',
  },
  syncActionIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  syncRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wheelPill: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    ...SHADOWS.card,
  },
  wheelPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  loginPill: {
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  loginPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
    position: 'relative',
    overflow: 'hidden',
  },
  metricAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  metricLabel: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  overdueSection: {
    backgroundColor: COLORS.risk.red.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  overdueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overdueBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    gap: 6,
  },
  alertPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.risk.red.dot,
  },
  overdueBadgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.risk.red.text,
  },
  overdueSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.risk.red.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overdueTaskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.risk.red.accent,
    ...SHADOWS.card,
  },
  overdueTaskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTypeBadge: {
    backgroundColor: COLORS.risk.red.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  taskTypeText: {
    color: COLORS.risk.red.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  overdueDate: {
    fontSize: 11,
    color: COLORS.risk.red.accent,
    fontWeight: '700',
  },
  overdueTargetName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  overdueNotes: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: 4,
    lineHeight: 18,
  },
  overdueActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  overdueActionBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  overdueActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  completeBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
  },
  scheduleTotalSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  badgeSmall: {
    backgroundColor: COLORS.risk.red.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  badgeSmallText: {
    color: COLORS.risk.red.text,
    fontWeight: '800',
    fontSize: 11,
  },
  redWatchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  redCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  motherName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  motherInfo: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  reasonsList: {
    backgroundColor: COLORS.risk.red.bg,
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
    gap: 3,
  },
  reasonChip: {
    paddingVertical: 1,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.risk.red.text,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Field tap target
  },
  callBtn: {
    backgroundColor: COLORS.accentPhoneLight,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentPhone,
  },
  whatsappBtn: {
    backgroundColor: COLORS.accentWhatsAppLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentWhatsApp,
  },
  visitBtn: {
    backgroundColor: COLORS.primary,
  },
  visitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  gnGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  gnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
    paddingBottom: 10,
    marginBottom: 10,
  },
  gnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gnPin: {
    fontSize: 13,
  },
  gnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  gnCountBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  gnCountText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  taskTargetName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  taskDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  doneBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  doneBtnText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  todayTimetableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    ...SHADOWS.card,
  },
  todayTimetableBannerOverride: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  timetableBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  timetableIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  timetableInfo: {
    flex: 1,
  },
  timetableTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  timetableTag: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timetableModifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  timetableModifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  timetableTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  timetableTime: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  timetableArrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timetableArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginTop: -2,
  },
});
