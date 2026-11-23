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
import {
  DashboardMetricsGrid,
  OverdueAlertSection,
  HighRiskWatchlist,
} from '@/src/components/dashboard';

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
      // Exclude TEMP_OUT / TRANSFERRED_OUT mothers from high-risk watchlist
      setRedMothers(
        allMothers.filter(
          (m) =>
            m.risk_level === 'RED' &&
            (!m.residency_status || m.residency_status === 'ACTIVE')
        )
      );
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
      Alert.alert(t('common.error', 'No Phone'), 'No phone number available for this contact.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert(t('common.error', 'Call Failed'), `Could not initiate call to ${phone}`);
    });
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      Alert.alert(t('common.error', 'No Phone'), 'No phone number recorded.');
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
        Alert.alert(t('common.error', 'Message Failed'), 'Could not open WhatsApp or SMS app.');
      });
    });
  };

  const handleCompleteTask = (taskId: string, targetName?: string, taskNotes?: string) => {
    const isSi = i18n.language === 'si';
    const patientStr = targetName ? ` (${targetName})` : '';

    Alert.alert(
      isSi ? 'කාර්යය සම්පූර්ණ කිරීම' : 'Complete Task',
      isSi
        ? `මෙම කාර්යය සම්පූර්ණ කළ බව සටහන් කරන්නද?${patientStr}`
        : `Mark this task as completed?${patientStr}`,
      [
        { text: isSi ? 'අවලංගුයි' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'සම්පූර්ණයි' : 'Mark Done',
          style: 'default',
          onPress: async () => {
            try {
              await completeTask(taskId);
              await loadData();
              await autoSync.refreshStatus();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to complete task');
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (targetId: string, targetType: 'MOTHER' | 'CHILD') => {
    if (targetType === 'MOTHER') {
      router.push(`/mother/${targetId}` as any);
    } else {
      router.push(`/child/${targetId}` as any);
    }
  };

  const overdueTasks = tasks.filter((t) => t.status === 'OVERDUE');
  const todayUpcomingTasks = tasks.filter((t) => t.status !== 'OVERDUE' && t.status !== 'COMPLETED');

  // Group today's upcoming tasks by GN division
  const tasksByGN = todayUpcomingTasks.reduce<Record<string, Task[]>>((acc, t) => {
    const gn = t.gn_division || 'General / Unassigned';
    if (!acc[gn]) acc[gn] = [];
    acc[gn].push(t);
    return acc;
  }, {});

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
      {/* 0. SYNC STATUS PILL BAR */}
      <View style={styles.syncBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.syncPill, autoSync.isOnline ? styles.syncOnline : styles.syncOffline]}
          disabled={autoSync.isSyncingNow}
          onPress={async () => {
            const res = await autoSync.triggerSync();
            await loadData();
            if (!res.success && res.message.includes('Sign in')) {
              Alert.alert('Cloud Sync', res.message, [
                { text: 'Later', style: 'cancel' },
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

      {/* 1. TOP METRIC CARDS (Decomposed Component) */}
      <DashboardMetricsGrid stats={stats} />

      {/* 2. OVERDUE / MISSED SECTION (Decomposed Component) */}
      <OverdueAlertSection
        tasks={overdueTasks}
        onViewProfile={handleViewProfile}
        onCompleteTask={handleCompleteTask}
      />

      {/* 3. HIGH-RISK (RED-TAG) WATCHLIST (Decomposed Component) */}
      <HighRiskWatchlist
        mothers={redMothers}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
      />

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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 8,
    flexShrink: 1,
    minHeight: 44,
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
  },
  syncRightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  wheelPill: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  wheelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  loginPill: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  loginPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  todayTimetableBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  todayTimetableBannerOverride: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FDE68A',
  },
  timetableBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timetableIcon: {
    fontSize: 26,
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
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timetableModifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  timetableModifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  timetableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  timetableTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  timetableArrowContainer: {
    paddingLeft: 8,
  },
  timetableArrowText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    color: COLORS.textPrimary,
  },
  scheduleTotalSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  gnGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  gnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderHairline,
  },
  gnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gnPin: {
    fontSize: 13,
  },
  gnTitle: {
    fontSize: 13,
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
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  taskCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderHairline,
  },
  taskTargetName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  taskDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  doneBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});
