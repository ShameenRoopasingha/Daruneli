import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/src/theme';
import {
  getScheduleTemplates,
  getOverridesForRange,
  getAutoPopulatedItemsForDay,
  getDistinctGnDivisions,
  getDailyHomeVisitCap,
  rescheduleTaskNextWeek,
  rescheduleItemToDate,
  applyAutoBalancePlan,
  clearOverrideForDate,
  type AutoPopulatedItem,
} from '@/src/db/repositories/scheduleRepo';
import {
  resolveDayPlan,
  computeAutoBalancePlan,
  type ScheduleTemplate,
  type ScheduleOverride,
  type ResolvedDayPlan,
} from '@/src/engine/scheduleEngine';
import {
  WeeklyTemplateModal,
  DayOverrideModal,
  AutoBalanceModal,
  ManualRescheduleModal,
} from '@/src/components';
import {
  WeekDayStrip,
  DayPlanBanner,
  ScheduleActionCard,
} from '@/src/components/schedule';

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export default function ScheduleScreen() {
  const { i18n } = useTranslation();
  const isSi = i18n.language === 'si';

  const todayStr = useMemo(() => formatDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [weekMonday, setWeekMonday] = useState<Date>(() => getMondayOfWeek(new Date()));

  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [gnDivisions, setGnDivisions] = useState<string[]>([]);
  const [items, setItems] = useState<AutoPopulatedItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dailyCap, setDailyCap] = useState<number>(8);

  // Modals
  const [templateModalVisible, setTemplateModalVisible] = useState<boolean>(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState<boolean>(false);
  const [autoBalanceModalVisible, setAutoBalanceModalVisible] = useState<boolean>(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState<boolean>(false);
  const [rescheduleTargetItem, setRescheduleTargetItem] = useState<AutoPopulatedItem | null>(null);

  // Generate 7 days for current week strip
  const weekDays = useMemo(() => {
    const days: { dateKey: string; dayIndex: number; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekMonday);
      d.setDate(d.getDate() + i);
      const dateKey = formatDateKey(d);
      days.push({
        dateKey,
        dayIndex: d.getDay(),
        dayNum: d.getDate(),
        isToday: dateKey === todayStr,
      });
    }
    return days;
  }, [weekMonday, todayStr]);

  const weekRangeText = useMemo(() => {
    if (weekDays.length === 0) return '';
    return `${formatDisplayDate(weekDays[0].dateKey)} - ${formatDisplayDate(weekDays[6].dateKey)}`;
  }, [weekDays]);

  const loadDataForDate = useCallback(
    async (targetDate: string, currentTemplates?: ScheduleTemplate[], currentOverrides?: ScheduleOverride[]) => {
      try {
        const tmpls = currentTemplates || (await getScheduleTemplates());
        let ovrs = currentOverrides;
        if (!ovrs) {
          const startKey = formatDateKey(weekMonday);
          const endD = new Date(weekMonday);
          endD.setDate(endD.getDate() + 6);
          const endKey = formatDateKey(endD);
          ovrs = await getOverridesForRange(startKey, endKey);
        }

        const plan = resolveDayPlan(targetDate, tmpls, ovrs);
        const dayItems = await getAutoPopulatedItemsForDay(targetDate, plan);
        setItems(dayItems);
      } catch (err) {
        console.error('Error loading items for date:', err);
      }
    },
    [weekMonday]
  );

  const loadData = useCallback(async () => {
    try {
      const [tmpls, gns, cap] = await Promise.all([
        getScheduleTemplates(),
        getDistinctGnDivisions(),
        getDailyHomeVisitCap(),
      ]);
      setTemplates(tmpls);
      setGnDivisions(gns);
      setDailyCap(cap);

      const startKey = formatDateKey(weekMonday);
      const endD = new Date(weekMonday);
      endD.setDate(endD.getDate() + 6);
      const endKey = formatDateKey(endD);
      const ovrs = await getOverridesForRange(startKey, endKey);
      setOverrides(ovrs);

      await loadDataForDate(selectedDate, tmpls, ovrs);
    } catch (err) {
      console.error('Error loading schedule:', err);
    }
  }, [weekMonday, selectedDate, loadDataForDate]);

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

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    loadDataForDate(dateKey, templates, overrides);
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekMonday);
    prev.setDate(prev.getDate() - 7);
    setWeekMonday(prev);
    const target = formatDateKey(prev);
    setSelectedDate(target);
    loadDataForDate(target);
  };

  const handleNextWeek = () => {
    const next = new Date(weekMonday);
    next.setDate(next.getDate() + 7);
    setWeekMonday(next);
    const target = formatDateKey(next);
    setSelectedDate(target);
    loadDataForDate(target);
  };

  const handleJumpToday = () => {
    setWeekMonday(getMondayOfWeek(new Date()));
    setSelectedDate(todayStr);
    loadDataForDate(todayStr, templates, overrides);
  };

  const resolvedPlan: ResolvedDayPlan = useMemo(() => {
    return resolveDayPlan(selectedDate, templates, overrides);
  }, [selectedDate, templates, overrides]);

  const selectedOverride = useMemo(() => {
    return overrides.find((o) => !o.deleted_at && o.override_date === selectedDate);
  }, [overrides, selectedDate]);

  const isOverloaded = useMemo(() => {
    return resolvedPlan.activity_type === 'HOME_VISIT' && items.length > dailyCap;
  }, [resolvedPlan.activity_type, items.length, dailyCap]);

  const autoBalanceProposal = useMemo(() => {
    if (!isOverloaded) return null;
    return computeAutoBalancePlan(
      selectedDate,
      items,
      dailyCap,
      templates,
      overrides
    );
  }, [isOverloaded, selectedDate, items, dailyCap, templates, overrides]);

  const handleOpenManualReschedule = (item: AutoPopulatedItem) => {
    setRescheduleTargetItem(item);
    setRescheduleModalVisible(true);
  };

  const handleApplyAutoBalance = async (proposal: any) => {
    try {
      await applyAutoBalancePlan(proposal);
      Alert.alert(
        isSi ? 'ස්වයංක්‍රීය තුලනය සාර්ථකයි' : 'Auto-Balance Applied',
        isSi
          ? `අඩු අවදානම් චාරිකා ${proposal.moves.length} ක් වෙනත් දිනවලට සාර්ථකව මාරු කරන ලදි.`
          : `Successfully rescheduled ${proposal.moves.length} routine visits.`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to apply auto-balance plan.');
    }
  };

  const handleConfirmManualReschedule = async (item: AutoPopulatedItem, targetDate: string) => {
    try {
      await rescheduleItemToDate(item, targetDate);
      Alert.alert(
        isSi ? 'චාරිකාව මාරු කරන ලදි' : 'Visit Rescheduled',
        isSi
          ? `${item.name} සඳහා වූ චාරිකාව ${targetDate} දිනට සාර්ථකව මාරු කරන ලදි.`
          : `Visit for ${item.name} rescheduled to ${targetDate}.`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reschedule visit.');
    }
  };

  const handleReschedule = (taskId: string, targetName: string) => {
    Alert.alert(
      isSi ? 'කාර්යය කල් දැමීම තහවුරු කරන්න' : 'Confirm Postponing Visit',
      isSi
        ? `${targetName} සඳහා වූ නියමිත චාරිකාව දින 7 කින් (+7d) ඉදිරියට කල් දැමීමට ඔබට අවශ්‍යද?`
        : `Are you sure you want to postpone the scheduled checkup for ${targetName} by 7 days (+1 week)?`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'කල් දමන්න (+7d)' : 'Postpone 7 Days',
          style: 'default',
          onPress: async () => {
            try {
              await rescheduleTaskNextWeek(taskId);
              Alert.alert(
                isSi ? 'කාර්යය කල් දමන ලදි' : 'Task Rescheduled',
                isSi
                  ? `${targetName} සඳහා වූ කාර්යය ලබන සතිය දක්වා සාර්ථකව කල් දමන ලදි.`
                  : `Task for ${targetName} was moved 7 days forward.`
              );
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not reschedule task.');
            }
          },
        },
      ]
    );
  };

  const handleRevertOverride = () => {
    Alert.alert(
      isSi ? 'මුල් සැලසුමට යළි සකසන්නද?' : 'Revert to Master Timetable?',
      isSi
        ? `${formatDisplayDate(selectedDate)} දින සඳහා වූ විශේෂ වෙනස්කම් ඉවත් කර මුල් සතිපතා කාලසටහනට යළි සැකසීමට ඔබට අවශ්‍යද?`
        : `Are you sure you want to remove the override for ${formatDisplayDate(selectedDate)} and restore the default weekly timetable?`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'යළි සකසන්න' : 'Revert',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearOverrideForDate(selectedDate);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not revert timetable.');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert(isSi ? 'දුරකථන අංකයක් නැත' : 'No Phone', isSi ? 'දුරකථන අංකයක් සටහන් කර නැත.' : 'No phone number available.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', `Could not initiate call to ${phone}`);
    });
  };

  const priorityItems = useMemo(
    () => items.filter((i) => i.isOverdue || i.badgeColor === 'red' || i.riskLevel === 'RED'),
    [items]
  );
  const regularItems = useMemo(
    () => items.filter((i) => !i.isOverdue && i.badgeColor !== 'red' && i.riskLevel !== 'RED'),
    [items]
  );

  return (
    <View style={styles.container}>
      {/* 1. Header & Week Navigation Strip */}
      <WeekDayStrip
        isSi={isSi}
        selectedDate={selectedDate}
        todayStr={todayStr}
        weekDays={weekDays}
        weekRangeText={weekRangeText}
        templates={templates}
        overrides={overrides}
        items={items}
        onSelectDate={handleSelectDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onJumpToday={handleJumpToday}
        onOpenSetup={() => setTemplateModalVisible(true)}
      />

      {/* 2. Main Scroll Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Day Plan & Overload Warning Banner */}
        <DayPlanBanner
          isSi={isSi}
          resolvedPlan={resolvedPlan}
          isOverloaded={isOverloaded}
          itemsCount={items.length}
          dailyCap={dailyCap}
          onOpenOverrideModal={() => setOverrideModalVisible(true)}
          onRevertOverride={handleRevertOverride}
          onOpenAutoBalanceModal={() => setAutoBalanceModalVisible(true)}
        />

        {/* 3. Action Items Section */}
        {resolvedPlan.activity_type === 'OFF' || resolvedPlan.activity_type === 'HOLIDAY' || resolvedPlan.activity_type === 'LEAVE' ? (
          <View style={styles.emptyDayContainer}>
            <Text style={styles.emptyDayIcon}>
              {resolvedPlan.activity_type === 'HOLIDAY' ? '🎉' : resolvedPlan.activity_type === 'LEAVE' ? '🏖️' : '☕'}
            </Text>
            <Text style={styles.emptyDayTitle}>
              {resolvedPlan.activity_type === 'HOLIDAY'
                ? isSi ? 'රජයේ / පොහොය නිවාඩු දිනයකි' : 'Public Holiday / Poya Day'
                : resolvedPlan.activity_type === 'LEAVE'
                ? isSi ? 'කාර්ය මණ්ඩල නිවාඩු දිනයකි' : 'Staff Leave Day'
                : isSi ? 'සතිපතා විවේක දිනයකි' : 'Scheduled Rest Day'}
            </Text>
            <Text style={styles.emptyDaySub}>
              {resolvedPlan.notes || (isSi ? 'අද දින සඳහා සායන හෝ ක්ෂේත්‍ර සංචාර සැලසුම් කර නොමැත.' : 'No field visits or clinics scheduled for this date.')}
            </Text>
          </View>
        ) : (
          <View style={styles.itemsSection}>
            {/* Section Header */}
            <View style={styles.actionHeaderRow}>
              <Text style={styles.sectionHeading}>
                {isSi ? 'අද දින සැලසුම් ලැයිස්තුව' : 'Action List for Today'}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{items.length}</Text>
              </View>
            </View>

            {items.length === 0 ? (
              <View style={styles.noItemsBox}>
                <Text style={styles.noItemsText}>
                  {isSi
                    ? 'මෙම දිනය සඳහා නියමිත කාර්යයන් හෝ සක්‍රිය මව්වරුන් වාර්තා වී නැත.'
                    : 'No pending clinic appointments or due tasks for this section.'}
                </Text>
              </View>
            ) : (
              <>
                {/* Priority / Overdue Group */}
                {priorityItems.length > 0 && (
                  <View style={styles.groupContainer}>
                    <View style={styles.groupHeaderRow}>
                      <Text style={styles.priorityGroupTitle}>
                        🚨 {isSi ? 'ඉහළ ප්‍රමුඛතාව / ප්‍රමාදයි' : 'High Priority & Overdue'}
                      </Text>
                      <Text style={styles.groupCount}>({priorityItems.length})</Text>
                    </View>

                    {priorityItems.map((item) => (
                      <ScheduleActionCard
                        key={item.id}
                        item={item}
                        isSi={isSi}
                        onCall={handleCall}
                        onReschedule7d={handleReschedule}
                        onOpenManualReschedule={handleOpenManualReschedule}
                      />
                    ))}
                  </View>
                )}

                {/* Scheduled / Regular Group */}
                {regularItems.length > 0 && (
                  <View style={styles.groupContainer}>
                    <View style={styles.groupHeaderRow}>
                      <Text style={styles.regularGroupTitle}>
                        📋 {isSi ? 'නියමිත චාරිකා සහ සේවා' : 'Scheduled Visits & Care'}
                      </Text>
                      <Text style={styles.groupCount}>({regularItems.length})</Text>
                    </View>

                    {regularItems.map((item) => (
                      <ScheduleActionCard
                        key={item.id}
                        item={item}
                        isSi={isSi}
                        onCall={handleCall}
                        onReschedule7d={handleReschedule}
                        onOpenManualReschedule={handleOpenManualReschedule}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <WeeklyTemplateModal
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onSaved={async () => {
          await loadData();
        }}
        templates={templates}
        gnDivisions={gnDivisions}
      />

      <DayOverrideModal
        visible={overrideModalVisible}
        onClose={() => setOverrideModalVisible(false)}
        onSaved={async () => {
          setOverrideModalVisible(false);
          await loadData();
        }}
        targetDate={selectedDate}
        existingOverride={selectedOverride}
        gnDivisions={gnDivisions}
      />

      <AutoBalanceModal
        visible={autoBalanceModalVisible}
        onClose={() => setAutoBalanceModalVisible(false)}
        onApply={handleApplyAutoBalance}
        proposal={autoBalanceProposal}
        dailyCap={dailyCap}
        currentTotal={items.length}
      />

      <ManualRescheduleModal
        visible={rescheduleModalVisible}
        onClose={() => {
          setRescheduleModalVisible(false);
          setRescheduleTargetItem(null);
        }}
        onReschedule={handleConfirmManualReschedule}
        item={rescheduleTargetItem}
        weekDays={weekDays}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemsSection: {
    marginTop: 8,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noItemsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  noItemsText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  priorityGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  regularGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
  },
  groupCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyDayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  emptyDayIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyDayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDaySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
