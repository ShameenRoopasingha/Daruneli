import React, { useState, useCallback, useMemo } from 'react';
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
import { COLORS, SHADOWS } from '@/src/theme';
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
  getDayDotIndicators,
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

const SHORT_WEEKDAYS = [
  { dayIndex: 1, en: 'Mon', si: 'සඳු' },
  { dayIndex: 2, en: 'Tue', si: 'අඟ' },
  { dayIndex: 3, en: 'Wed', si: 'බදා' },
  { dayIndex: 4, en: 'Thu', si: 'බ්‍රහ' },
  { dayIndex: 5, en: 'Fri', si: 'සිකු' },
  { dayIndex: 6, en: 'Sat', si: 'සෙන' },
  { dayIndex: 0, en: 'Sun', si: 'ඉරි' },
];

export default function ScheduleScreen() {
  const router = useRouter();
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

  // Generate 7 days for the current week strip
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
          const start = weekDays[0]?.dateKey || targetDate;
          const end = weekDays[6]?.dateKey || targetDate;
          ovrs = await getOverridesForRange(start, end);
        }

        const resolved = resolveDayPlan(targetDate, tmpls, ovrs);
        const dayItems = await getAutoPopulatedItemsForDay(targetDate, resolved);
        setItems(dayItems);
      } catch (err) {
        console.error('Error loading day items:', err);
      }
    },
    [weekDays]
  );

  const loadData = useCallback(async () => {
    try {
      const [allTemplates, gns, cap] = await Promise.all([
        getScheduleTemplates(),
        getDistinctGnDivisions(),
        getDailyHomeVisitCap(),
      ]);
      setTemplates(allTemplates);
      setGnDivisions(gns.length > 0 ? gns : ['Kottawa North', 'Kottawa South', 'Maharagama East', 'Maharagama West']);
      setDailyCap(cap);

      let weekOverrides: ScheduleOverride[] = [];
      if (weekDays.length > 0) {
        const start = weekDays[0].dateKey;
        const end = weekDays[6].dateKey;
        weekOverrides = await getOverridesForRange(start, end);
        setOverrides(weekOverrides);
      }

      await loadDataForDate(selectedDate, allTemplates, weekOverrides);
    } catch (err) {
      console.error('Error loading schedule templates/overrides:', err);
    }
  }, [weekDays, selectedDate, loadDataForDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSelectDate = async (dateKey: string) => {
    setSelectedDate(dateKey);
    await loadDataForDate(dateKey, templates, overrides);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekMonday);
    prev.setDate(prev.getDate() - 7);
    setWeekMonday(prev);
    const newSelected = formatDateKey(prev);
    setSelectedDate(newSelected);
    loadDataForDate(newSelected, templates, overrides);
  };

  const handleNextWeek = () => {
    const next = new Date(weekMonday);
    next.setDate(next.getDate() + 7);
    setWeekMonday(next);
    const newSelected = formatDateKey(next);
    setSelectedDate(newSelected);
    loadDataForDate(newSelected, templates, overrides);
  };

  const handleJumpToday = () => {
    const newMonday = getMondayOfWeek(new Date());
    setWeekMonday(newMonday);
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

  // Reschedule a task to +7 days with confirmation
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

  // Revert override to master timetable with confirmation
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

  // Group items into priority/overdue and regular scheduled
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
      {/* 1. Header & Week Navigation */}
      <View style={styles.topControlCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleWithIcon}>
            <Text style={styles.calendarIcon}>📅</Text>
            <View>
              <Text style={styles.headerTitle}>
                {isSi ? 'සතිපතා කාලසටහන' : 'Advance Programme'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isSi ? 'ක්ෂේත්‍ර සහ සායන සැලසුම' : 'Weekly Field & Clinic Schedule'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => setTemplateModalVisible(true)}
          >
            <Text style={styles.setupBtnText}>⚙️ {isSi ? 'සැලසුම' : 'Setup'}</Text>
          </TouchableOpacity>
        </View>

        {/* Week Range Strip & Nav Arrows */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevWeek}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.weekCenterBox}>
            <Text style={styles.weekRangeText}>{weekRangeText}</Text>
            {selectedDate !== todayStr && (
              <TouchableOpacity style={styles.todayChip} onPress={handleJumpToday}>
                <Text style={styles.todayChipText}>{isSi ? 'අද දිනය' : 'Today'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.arrowBtn} onPress={handleNextWeek}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 7-Day Horizontal Strip */}
        <View style={styles.daysStrip}>
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.dateKey;
            const shortWd = SHORT_WEEKDAYS.find((w) => w.dayIndex === d.dayIndex);
            const planForDay = resolveDayPlan(d.dateKey, templates, overrides);
            const indicators = getDayDotIndicators(d.dateKey, planForDay, items);

            let dotColor = '#94A3B8'; // gray / off
            if (indicators.hasUrgentRed) dotColor = '#EF4444'; // red
            else if (indicators.isClinic) dotColor = '#0284C7'; // blue
            else if (indicators.isHomeVisit) dotColor = '#10B981'; // green

            return (
              <TouchableOpacity
                key={d.dateKey}
                style={[
                  styles.dayPill,
                  isSelected && styles.dayPillSelected,
                  d.isToday && !isSelected && styles.dayPillToday,
                ]}
                onPress={() => handleSelectDate(d.dateKey)}
              >
                <Text
                  style={[styles.dayShortName, isSelected && styles.dayShortNameSelected]}
                  numberOfLines={1}
                >
                  {isSi ? shortWd?.si : shortWd?.en}
                </Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                  {d.dayNum}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* 2. Selected Day Plan Banner */}
        <View style={[styles.planBanner, resolvedPlan.is_override && styles.planBannerOverride]}>
          <View style={styles.bannerHeaderRow}>
            <View style={styles.bannerBadgeContainer}>
              <View
                style={[
                  styles.activityBadge,
                  resolvedPlan.activity_type === 'ANC_CLINIC' || resolvedPlan.activity_type === 'CWC_CLINIC'
                    ? styles.badgeClinic
                    : resolvedPlan.activity_type === 'HOME_VISIT'
                    ? styles.badgeHome
                    : resolvedPlan.activity_type === 'MOH_OFFICE'
                    ? styles.badgeOffice
                    : styles.badgeRest,
                ]}
              >
                <Text style={styles.activityBadgeText}>
                  {resolvedPlan.activity_type === 'ANC_CLINIC'
                    ? '🤰 ' + (isSi ? 'පූර්ව ප්‍රසව සායනය' : 'ANC Clinic')
                    : resolvedPlan.activity_type === 'CWC_CLINIC'
                    ? '👶 ' + (isSi ? 'ළමා සායනය / එන්නත්' : 'CWC Clinic')
                    : resolvedPlan.activity_type === 'HOME_VISIT'
                    ? '🏡 ' + (isSi ? 'ගෘහ චාරිකා' : 'Home Visits')
                    : resolvedPlan.activity_type === 'MOH_OFFICE'
                    ? '🏢 ' + (isSi ? 'කාර්යාල දිනය' : 'MOH Office')
                    : resolvedPlan.activity_type === 'CATCH_UP'
                    ? '⚡ ' + (isSi ? 'මගහැරුණු චාරිකා' : 'Catch-Up')
                    : '☕ ' + (isSi ? 'විවේක දිනය' : 'Rest / Off')}
                </Text>
              </View>

              {resolvedPlan.is_override && (
                <View style={styles.modifiedPill}>
                  <Text style={styles.modifiedPillText}>
                    ✏️ {isSi ? 'වෙනස් කළ දිනයකි' : 'Modified'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.overrideBtn}
              onPress={() => setOverrideModalVisible(true)}
            >
              <Text style={styles.overrideBtnText}>
                {isSi ? 'දිනය වෙනස් කරන්න' : 'Override Day'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.planTitle}>{resolvedPlan.title}</Text>

          <View style={styles.planMetaRow}>
            {resolvedPlan.gn_division && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>📍 {resolvedPlan.gn_division}</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                ⏰ {resolvedPlan.start_time} – {resolvedPlan.end_time}
              </Text>
            </View>
          </View>

          {resolvedPlan.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>📝 {resolvedPlan.notes}</Text>
            </View>
          )}

          {resolvedPlan.is_override && (
            <TouchableOpacity
              style={styles.resetPlanLink}
              onPress={handleRevertOverride}
            >
              <Text style={styles.resetPlanLinkText}>
                ↺ {isSi ? 'මුල් සතිපතා සැලසුමට යළි සකසන්න' : 'Revert to Master Timetable'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2.5 OVERLOAD ALERT BANNER (ONLY for HOME_VISIT days exceeding cap) */}
        {isOverloaded && (
          <View style={styles.overloadBanner}>
            <View style={styles.overloadBannerLeft}>
              <Text style={styles.overloadAlertIcon}>⚠️</Text>
              <View style={styles.overloadInfo}>
                <View style={styles.overloadHeaderRow}>
                  <Text style={styles.overloadTitle}>
                    {isSi ? 'වැඩ බර අධික දිනයකි' : 'Day Overloaded'}
                  </Text>
                  <View style={styles.overloadCountPill}>
                    <Text style={styles.overloadCountText}>
                      {items.length} / {dailyCap} {isSi ? 'චාරිකා' : 'Visits'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.overloadSub}>
                  {isSi
                    ? `දෛනික සීමාවට (${dailyCap}) වඩා චාරිකා ${items.length - dailyCap} ක් වැඩියි. අඩු අවදානම් චාරිකා සෙනසුරාදාට හෝ වෙනත් දිනවලට ස්වයංක්‍රීයව තුලනය කළ හැක.`
                    : `Exceeds daily cap by ${items.length - dailyCap} visits. High-risk visits will remain locked.`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.autoBalanceBtn}
              onPress={() => setAutoBalanceModalVisible(true)}
            >
              <Text style={styles.autoBalanceBtnText}>
                ⚡ {isSi ? 'ස්වයංක්‍රීය තුලනය' : 'Auto-Balance'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Action Items Section */}
        {resolvedPlan.activity_type === 'OFF' || resolvedPlan.activity_type === 'HOLIDAY' || resolvedPlan.activity_type === 'LEAVE' ? (
          <View style={styles.emptyDayContainer}>
            <Text style={styles.emptyDayEmoji}>
              {resolvedPlan.activity_type === 'HOLIDAY' ? '🌕' : resolvedPlan.activity_type === 'LEAVE' ? '🏖️' : '☕'}
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

                    {priorityItems.map((item) =>
                      renderActionCard(
                        item,
                        router,
                        isSi,
                        handleCall,
                        handleReschedule,
                        handleOpenManualReschedule
                      )
                    )}
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

                    {regularItems.map((item) =>
                      renderActionCard(
                        item,
                        router,
                        isSi,
                        handleCall,
                        handleReschedule,
                        handleOpenManualReschedule
                      )
                    )}
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

function renderActionCard(
  item: AutoPopulatedItem,
  router: any,
  isSi: boolean,
  handleCall: (phone?: string) => void,
  handleReschedule: (taskId: string, targetName: string) => void,
  handleOpenManualReschedule: (item: AutoPopulatedItem) => void
) {
  if (item.type === 'SUMMARY') {
    return (
      <View key={item.id} style={styles.summaryCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.summaryTitle}>📊 {item.name}</Text>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{item.badgeText}</Text>
          </View>
        </View>
        <Text style={styles.summaryReason}>{item.reason}</Text>
        <TouchableOpacity
          style={styles.openH509Btn}
          onPress={() => router.push('/(tabs)/area')}
        >
          <Text style={styles.openH509BtnText}>
            {isSi ? 'H509 වාර්තාව සහ ප්‍රදේශ දළ විශ්ලේෂණය බලන්න ›' : 'Open H509 Monthly Report ›'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMother = item.type === 'MOTHER' || (item.type === 'TASK' && item.motherId);
  const profileId = item.motherId || item.childId || item.targetId;

  return (
    <View key={item.id} style={styles.actionCard}>
      {/* Top row: Name & Badges */}
      <View style={styles.cardHeader}>
        <View style={styles.nameBlock}>
          <Text style={styles.targetName}>
            {item.childId ? '👶 ' : '🤰 '}
            {item.name}
          </Text>
          {item.gnDivision && (
            <Text style={styles.targetGn}>📍 {item.gnDivision}</Text>
          )}
        </View>

        <View style={styles.badgeWrapRow}>
          <View
            style={[
              styles.itemBadge,
              item.badgeColor === 'red'
                ? styles.badgeRed
                : item.badgeColor === 'yellow'
                ? styles.badgeYellow
                : item.badgeColor === 'blue'
                ? styles.badgeBlue
                : styles.badgeGreen,
            ]}
          >
            <Text
              style={[
                styles.itemBadgeText,
                item.badgeColor === 'red'
                  ? styles.badgeRedText
                  : item.badgeColor === 'yellow'
                  ? styles.badgeYellowText
                  : item.badgeColor === 'blue'
                  ? styles.badgeBlueText
                  : styles.badgeGreenText,
              ]}
            >
              {item.badgeText}
            </Text>
          </View>
        </View>
      </View>

      {/* Reason subtitle */}
      <Text style={styles.reasonText}>{item.reason}</Text>

      {/* Action Buttons Row */}
      <View style={styles.actionBtnRow}>
        {/* Profile Button */}
        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => {
            if (isMother) {
              router.push(`/mother/${profileId}`);
            } else {
              router.push(`/child/${profileId}`);
            }
          }}
        >
          <Text style={styles.actionBtnSecondaryText}>
            👤 {isSi ? 'ප්‍රොෆයිලය' : 'Profile'}
          </Text>
        </TouchableOpacity>

        {/* Visit / Record Button */}
        <TouchableOpacity
          style={styles.actionBtnPrimary}
          onPress={() => {
            if (isMother) {
              if (item.pregnancyId) {
                router.push(`/mother/visit?pregnancyId=${item.pregnancyId}`);
              } else {
                router.push(`/mother/${profileId}`);
              }
            } else {
              router.push(`/child/growth?childId=${profileId}`);
            }
          }}
        >
          <Text style={styles.actionBtnPrimaryText}>
            📝 {isMother ? (isSi ? 'සංචාරය' : 'Log Visit') : (isSi ? 'වර්ධනය / එන්නත්' : 'Growth/EPI')}
          </Text>
        </TouchableOpacity>

        {/* Call Button */}
        {item.phone && (
          <TouchableOpacity
            style={styles.actionBtnCall}
            onPress={() => handleCall(item.phone)}
          >
            <Text style={styles.actionBtnCallText}>📞</Text>
          </TouchableOpacity>
        )}

        {/* Reschedule Button (+7 Days for Tasks) */}
        {item.taskId && (
          <TouchableOpacity
            style={styles.actionBtnReschedule}
            onPress={() => handleReschedule(item.taskId!, item.name)}
          >
            <Text style={styles.actionBtnRescheduleText}>+7d</Text>
          </TouchableOpacity>
        )}

        {/* Manual Date Reschedule Button */}
        <TouchableOpacity
          style={styles.actionBtnMoveDate}
          onPress={() => handleOpenManualReschedule(item)}
        >
          <Text style={styles.actionBtnMoveDateText}>📅</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topControlCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...SHADOWS.card,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  setupBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  setupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: -2,
  },
  weekCenterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  todayChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDeep,
  },
  daysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayPillToday: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  dayShortName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  dayShortNameSelected: {
    color: '#FFFFFF',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  planBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  planBannerOverride: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF5',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bannerBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  activityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeClinic: {
    backgroundColor: '#E0F2FE',
  },
  badgeHome: {
    backgroundColor: '#DCFCE7',
  },
  badgeOffice: {
    backgroundColor: '#F3E8FF',
  },
  badgeRest: {
    backgroundColor: '#F1F5F9',
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  modifiedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  overrideBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overrideBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  planMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  resetPlanLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  resetPlanLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  emptyDayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyDayEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyDayTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyDaySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  itemsSection: {
    marginTop: 6,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDeep,
  },
  noItemsBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  priorityGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  regularGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameBlock: {
    flex: 1,
    marginRight: 8,
  },
  targetName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  targetGn: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  badgeWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeRed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeRedText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeYellow: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeYellowText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeBlue: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  badgeBlueText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeGreenText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnSecondary: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBtnCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCallText: {
    fontSize: 14,
  },
  actionBtnReschedule: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnRescheduleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    ...SHADOWS.card,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  summaryReason: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 18,
  },
  openH509Btn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  openH509BtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  overloadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    ...SHADOWS.card,
  },
  overloadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  overloadAlertIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  overloadInfo: {
    flex: 1,
  },
  overloadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  overloadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  overloadCountPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
  },
  overloadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  overloadSub: {
    fontSize: 11.5,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  autoBalanceBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoBalanceBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnMoveDate: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnMoveDateText: {
    fontSize: 12,
  },
});
