import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';
import { ResolvedDayPlan, ScheduleTemplate, ScheduleOverride, resolveDayPlan, getDayDotIndicators } from '@/src/engine/scheduleEngine';
import { AutoPopulatedItem } from '@/src/db/repositories/scheduleRepo';

interface WeekDayItem {
  dateKey: string;
  dayIndex: number;
  dayNum: number;
  isToday: boolean;
}

interface WeekDayStripProps {
  isSi: boolean;
  selectedDate: string;
  todayStr: string;
  weekDays: WeekDayItem[];
  weekRangeText: string;
  templates: ScheduleTemplate[];
  overrides: ScheduleOverride[];
  items: AutoPopulatedItem[];
  onSelectDate: (dateKey: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToday: () => void;
  onOpenSetup: () => void;
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

export const WeekDayStrip: React.FC<WeekDayStripProps> = ({
  isSi,
  selectedDate,
  todayStr,
  weekDays,
  weekRangeText,
  templates,
  overrides,
  items,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onJumpToday,
  onOpenSetup,
}) => {
  return (
    <View style={styles.topControlCard}>
      {/* 1. Top Header Row with Icon, Title, and Setup Button */}
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
          onPress={onOpenSetup}
        >
          <Text style={styles.setupBtnText}>⚙️ {isSi ? 'සැලසුම' : 'Setup'}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Week Range Strip & Nav Arrows */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.arrowBtn} onPress={onPrevWeek}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.weekCenterBox}>
          <Text style={styles.weekRangeText}>{weekRangeText}</Text>
          {selectedDate !== todayStr && (
            <TouchableOpacity style={styles.todayChip} onPress={onJumpToday}>
              <Text style={styles.todayChipText}>{isSi ? 'අද දිනය' : 'Today'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.arrowBtn} onPress={onNextWeek}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 3. 7-Day Horizontal Strip */}
      <View style={styles.daysStrip}>
        {weekDays.map((d) => {
          const isSelected = selectedDate === d.dateKey;
          const shortWd = SHORT_WEEKDAYS.find((w) => w.dayIndex === d.dayIndex);
          const planForDay: ResolvedDayPlan = resolveDayPlan(d.dateKey, templates, overrides);
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
              onPress={() => onSelectDate(d.dateKey)}
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
  );
};

const styles = StyleSheet.create({
  topControlCard: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...SHADOWS.card,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  setupBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  setupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  weekCenterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  todayChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
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
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  dayPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayPillToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayShortName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dayShortNameSelected: {
    color: COLORS.textWhite,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayNumberSelected: {
    color: COLORS.textWhite,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
});
