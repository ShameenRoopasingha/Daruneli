import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SHADOWS } from '../theme';
import type { ScheduleTemplate, WeekPattern, ActivityType } from '../engine/scheduleEngine';
import {
  upsertScheduleTemplate,
  softDeleteScheduleTemplate,
  getDailyHomeVisitCap,
  setDailyHomeVisitCap,
  DAILY_CAP_OPTIONS,
} from '../db/repositories/scheduleRepo';

interface WeeklyTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  templates: ScheduleTemplate[];
  gnDivisions: string[];
}

const WEEKDAYS = [
  { value: 1, label: 'Mon', fullSi: 'සඳුදා', fullEn: 'Monday' },
  { value: 2, label: 'Tue', fullSi: 'අඟහරුවාදා', fullEn: 'Tuesday' },
  { value: 3, label: 'Wed', fullSi: 'බදාදා', fullEn: 'Wednesday' },
  { value: 4, label: 'Thu', fullSi: 'බ්‍රහස්පතින්දා', fullEn: 'Thursday' },
  { value: 5, label: 'Fri', fullSi: 'සිකුරාදා', fullEn: 'Friday' },
  { value: 6, label: 'Sat', fullSi: 'සෙනසුරාදා', fullEn: 'Saturday' },
  { value: 0, label: 'Sun', fullSi: 'ඉරිදා', fullEn: 'Sunday' },
];

const WEEK_PATTERNS: { value: WeekPattern; label: string; si: string }[] = [
  { value: 'ALL', label: 'Every Week', si: 'සෑම සතියකම' },
  { value: '1_3', label: '1st & 3rd', si: '1 සහ 3 වන සති' },
  { value: '2_4', label: '2nd & 4th', si: '2 සහ 4 වන සති' },
  { value: 'FIRST', label: '1st Week Only', si: '1 වන සතිය' },
  { value: 'LAST', label: 'Last Week', si: 'අවසාන සතිය' },
];

const ACTIVITY_TYPES: { value: ActivityType; label: string; si: string; color: string; icon: string }[] = [
  { value: 'HOME_VISIT', label: 'Home Visits', si: 'ගෘහ චාරිකා', color: '#10B981', icon: '🏡' },
  { value: 'ANC_CLINIC', label: 'Antenatal Clinic', si: 'පූර්ව ප්‍රසව සායනය', color: '#0284C7', icon: '🤰' },
  { value: 'CWC_CLINIC', label: 'Child Welfare / EPI', si: 'ළමා සායනය / එන්නත්', color: '#6366F1', icon: '👶' },
  { value: 'MOH_OFFICE', label: 'MOH Office / Review', si: 'කාර්යාල දිනය', color: '#8B5CF6', icon: '🏢' },
  { value: 'CATCH_UP', label: 'Overdue Follow-ups', si: 'මගහැරුණු චාරිකා', color: '#F59E0B', icon: '⚡' },
  { value: 'OFF', label: 'Rest Day / Off', si: 'විවේක දිනය', color: '#64748B', icon: '☕' },
];

const TIME_PRESETS = [
  { label: '08:30 – 16:00 (Full Day)', start: '08:30', end: '16:00' },
  { label: '08:30 – 13:00 (Morning Clinic)', start: '08:30', end: '13:00' },
  { label: '08:30 – 12:30 (Half Day)', start: '08:30', end: '12:30' },
];

export const WeeklyTemplateModal: React.FC<WeeklyTemplateModalProps> = ({
  visible,
  onClose,
  onSaved,
  templates,
  gnDivisions,
}) => {
  const { i18n } = useTranslation();
  const isSi = i18n.language === 'si';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [weekPattern, setWeekPattern] = useState<WeekPattern>('ALL');
  const [activityType, setActivityType] = useState<ActivityType>('HOME_VISIT');
  const [gnDivision, setGnDivision] = useState<string>(gnDivisions[0] || 'Kottawa North');
  const [startTime, setStartTime] = useState<string>('08:30');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [dailyCap, setDailyCap] = useState<number>(8);

  useEffect(() => {
    let isMounted = true;
    getDailyHomeVisitCap().then((cap) => {
      if (isMounted) setDailyCap(cap);
    });
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleSelectCap = async (cap: number) => {
    setDailyCap(cap);
    await setDailyHomeVisitCap(cap);
    onSaved();
  };

  const startNewRule = (day?: number) => {
    setEditingId('NEW');
    setDayOfWeek(day !== undefined ? day : 1);
    setWeekPattern('ALL');
    setActivityType('HOME_VISIT');
    setGnDivision(gnDivisions[0] || 'Kottawa North');
    setStartTime('08:30');
    setEndTime('16:00');
    setCustomTitle('');
  };

  const startEditRule = (tmpl: ScheduleTemplate) => {
    setEditingId(tmpl.id);
    setDayOfWeek(tmpl.day_of_week);
    setWeekPattern(tmpl.week_pattern);
    setActivityType(tmpl.activity_type);
    setGnDivision(tmpl.gn_division || gnDivisions[0] || 'Kottawa North');
    setStartTime(tmpl.start_time || '08:30');
    setEndTime(tmpl.end_time || '16:00');
    setCustomTitle(tmpl.title);
  };

  const handleSave = async () => {
    try {
      const actObj = ACTIVITY_TYPES.find((a) => a.value === activityType);
      const patObj = WEEK_PATTERNS.find((p) => p.value === weekPattern);

      let title = customTitle.trim();
      if (!title) {
        if (activityType === 'HOME_VISIT') {
          title = isSi ? `ගෘහ චාරිකා: ${gnDivision}` : `Home Visits: ${gnDivision}`;
        } else {
          title = isSi
            ? `${actObj?.si || activityType} (${patObj?.si || ''})`
            : `${actObj?.label || activityType} (${patObj?.label || ''})`;
        }
      }

      await upsertScheduleTemplate({
        id: editingId === 'NEW' ? undefined : editingId || undefined,
        day_of_week: dayOfWeek,
        week_pattern: weekPattern,
        activity_type: activityType,
        gn_division: activityType === 'HOME_VISIT' ? gnDivision : null,
        title,
        start_time: startTime,
        end_time: endTime,
      });

      setEditingId(null);
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save template rule.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      isSi ? 'රීතිය මකන්නද?' : 'Delete Rule?',
      isSi ? 'මෙම සතිපතා වැඩසටහන් රීතිය ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න.' : 'Are you sure you want to remove this recurring schedule rule?',
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'මකන්න' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDeleteScheduleTemplate(id);
              if (editingId === id) setEditingId(null);
              onSaved();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete template rule.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              {isSi ? 'සතිපතා සැලසුම් සැකසුම' : 'Weekly Timetable Setup'}
            </Text>
            <Text style={styles.headerSub}>
              {isSi ? 'මහජන සෞඛ්‍ය හෙද නිලධාරී අත්තිකාරම් වැඩසටහන (Advance Programme)' : 'PHM Advance Programme Master Schedule'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {editingId ? (
            /* Editing / Creating Form */
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Text style={styles.formTitle}>
                  {editingId === 'NEW'
                    ? isSi ? '+ නව රීතියක් එක් කරන්න' : '+ Add Schedule Rule'
                    : isSi ? 'රීතිය සංස්කරණය' : 'Edit Schedule Rule'}
                </Text>
                <TouchableOpacity onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelLinkText}>{isSi ? 'ආපසු' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>

              {/* Day of Week */}
              <Text style={styles.sectionLabel}>{isSi ? 'සතියේ දිනය' : 'Day of the Week'}</Text>
              <View style={styles.chipRow}>
                {WEEKDAYS.map((d) => {
                  const isSelected = dayOfWeek === d.value;
                  return (
                    <TouchableOpacity
                      key={d.value}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setDayOfWeek(d.value)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {isSi ? d.fullSi.substring(0, 4) : d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Week Pattern */}
              <Text style={styles.sectionLabel}>{isSi ? 'සති රටාව' : 'Recurrence / Week Pattern'}</Text>
              <View style={styles.chipRow}>
                {WEEK_PATTERNS.map((p) => {
                  const isSelected = weekPattern === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setWeekPattern(p.value)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {isSi ? p.si : p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Activity Type */}
              <Text style={styles.sectionLabel}>{isSi ? 'ක්‍රියාකාරකම් වර්ගය' : 'Activity Type'}</Text>
              <View style={styles.chipRow}>
                {ACTIVITY_TYPES.map((a) => {
                  const isSelected = activityType === a.value;
                  return (
                    <TouchableOpacity
                      key={a.value}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setActivityType(a.value)}
                    >
                      <Text style={styles.chipIcon}>{a.icon}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {isSi ? a.si : a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* GN Division (for Home Visits) */}
              {activityType === 'HOME_VISIT' && (
                <>
                  <Text style={styles.sectionLabel}>
                    {isSi ? 'අදාළ ග්‍රාම නිලධාරී කොට්ඨාසය' : 'Assigned GN Division'}
                  </Text>
                  <View style={styles.chipRow}>
                    {gnDivisions.map((gn) => {
                      const isSelected = gnDivision === gn;
                      return (
                        <TouchableOpacity
                          key={gn}
                          style={[styles.chip, isSelected && styles.chipActive]}
                          onPress={() => setGnDivision(gn)}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            📍 {gn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Time Presets */}
              <Text style={styles.sectionLabel}>{isSi ? 'වේලාව' : 'Time Slot'}</Text>
              <View style={styles.chipRow}>
                {TIME_PRESETS.map((t) => {
                  const isSelected = startTime === t.start && endTime === t.end;
                  return (
                    <TouchableOpacity
                      key={t.label}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        setStartTime(t.start);
                        setEndTime(t.end);
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        ⏰ {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.formBtnRow}>
                {editingId !== 'NEW' && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(editingId)}
                  >
                    <Text style={styles.deleteBtnText}>{isSi ? 'මකන්න' : 'Delete'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>
                    {isSi ? 'සුරකින්න' : 'Save Rule'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Current Rules List Grouped by Day */
            <View>
              {/* Daily Cap Setting Card */}
              <View style={styles.capSettingCard}>
                <View style={styles.capHeaderRow}>
                  <Text style={styles.capTitle}>
                    🎯 {isSi ? 'දෛනික ගෘහ චාරිකා උපරිම සීමාව' : 'Daily Home Visit Limit'}
                  </Text>
                  <View style={styles.currentCapBadge}>
                    <Text style={styles.currentCapBadgeText}>
                      {dailyCap} {isSi ? 'චාරිකා' : 'visits'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.capSub}>
                  {isSi
                    ? 'වැඩ බර අධික දින ස්වයංක්‍රීයව හඳුනාගෙන තුලනය කිරීම සඳහා දෛනික උපරිම සීමාව තෝරන්න.'
                    : 'Target threshold to detect overloaded days and suggest smart auto-balancing.'}
                </Text>
                <View style={styles.capChipsRow}>
                  {DAILY_CAP_OPTIONS.map((cap) => {
                    const isSelected = dailyCap === cap;
                    return (
                      <TouchableOpacity
                        key={cap}
                        style={[styles.capChip, isSelected && styles.capChipActive]}
                        onPress={() => handleSelectCap(cap)}
                      >
                        <Text style={[styles.capChipText, isSelected && styles.capChipTextActive]}>
                          {cap} {cap === 8 ? (isSi ? '(සාමාන්‍ය)' : '(Default)') : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.listHeaderRow}>
                <Text style={styles.listTitle}>
                  {isSi ? 'වත්මන් සතිපතා වැඩසටහන' : 'Active Programme Rules'}
                </Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => startNewRule()}>
                  <Text style={styles.addBtnText}>{isSi ? '+ නව රීතියක්' : '+ Add Rule'}</Text>
                </TouchableOpacity>
              </View>

              {WEEKDAYS.map((day) => {
                const dayTemplates = templates.filter((t) => t.day_of_week === day.value);
                return (
                  <View key={day.value} style={styles.dayGroup}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayTitle}>
                        {isSi ? day.fullSi : day.fullEn}
                      </Text>
                      <TouchableOpacity onPress={() => startNewRule(day.value)}>
                        <Text style={styles.quickAddText}>{isSi ? '+ එක් කරන්න' : '+ Add'}</Text>
                      </TouchableOpacity>
                    </View>

                    {dayTemplates.length === 0 ? (
                      <View style={styles.emptyDayBox}>
                        <Text style={styles.emptyDayText}>
                          {day.value === 0
                            ? isSi ? 'විවේක දිනය (Off)' : 'Rest Day (Off)'
                            : isSi ? 'වැඩසටහනක් සටහන් කර නැත' : 'No rule defined for this day'}
                        </Text>
                      </View>
                    ) : (
                      dayTemplates.map((t) => {
                        const act = ACTIVITY_TYPES.find((a) => a.value === t.activity_type);
                        const pat = WEEK_PATTERNS.find((p) => p.value === t.week_pattern);
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={styles.ruleCard}
                            onPress={() => startEditRule(t)}
                          >
                            <View style={styles.ruleLeft}>
                              <Text style={styles.ruleIcon}>{act?.icon || '📋'}</Text>
                              <View style={styles.ruleInfo}>
                                <Text style={styles.ruleName}>{t.title}</Text>
                                <View style={styles.badgeRow}>
                                  <View style={[styles.pill, { backgroundColor: COLORS.primaryLight }]}>
                                    <Text style={[styles.pillText, { color: COLORS.primaryDeep }]}>
                                      {isSi ? pat?.si : pat?.label}
                                    </Text>
                                  </View>
                                  {t.gn_division && (
                                    <View style={[styles.pill, { backgroundColor: '#F1F5F9' }]}>
                                      <Text style={[styles.pillText, { color: COLORS.textSecondary }]}>
                                        📍 {t.gn_division}
                                      </Text>
                                    </View>
                                  )}
                                  <View style={[styles.pill, { backgroundColor: '#F8FAFC' }]}>
                                    <Text style={[styles.pillText, { color: COLORS.textTertiary }]}>
                                      ⏰ {t.start_time} - {t.end_time}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                            <Text style={styles.editArrow}>›</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  dayGroup: {
    marginBottom: 18,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyDayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  ruleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ruleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editArrow: {
    fontSize: 22,
    color: '#94A3B8',
    marginLeft: 8,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: COLORS.primaryDeep,
    fontWeight: '800',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  capSettingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    ...SHADOWS.card,
  },
  capHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  capTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  currentCapBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  currentCapBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDeep,
  },
  capSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  capChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  capChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  capChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  capChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  capChipTextActive: {
    color: '#FFFFFF',
  },
});
