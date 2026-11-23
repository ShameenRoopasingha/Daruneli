import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme';
import type { ActivityType, ScheduleOverride } from '../engine/scheduleEngine';
import { upsertScheduleOverride, clearOverrideForDate } from '../db/repositories/scheduleRepo';

interface DayOverrideModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  targetDate: string; // YYYY-MM-DD
  existingOverride?: ScheduleOverride | null;
  gnDivisions: string[];
}

const OVERRIDE_ACTIVITIES: { value: ActivityType; label: string; si: string; icon: string; isHoliday?: boolean }[] = [
  { value: 'HOLIDAY', label: 'Public Holiday / Poya', si: 'පොහොය / රජයේ නිවාඩු', icon: '🌕', isHoliday: true },
  { value: 'LEAVE', label: 'Staff Leave', si: 'පුද්ගලික / කාර්ය මණ්ඩල නිවාඩු', icon: '🏖️', isHoliday: true },
  { value: 'HOME_VISIT', label: 'Swap: Home Visits', si: 'ගෘහ චාරිකා සඳහා මාරු කරන්න', icon: '🏡' },
  { value: 'ANC_CLINIC', label: 'Swap: Antenatal Clinic', si: 'පූර්ව ප්‍රසව සායනයට මාරු කරන්න', icon: '🤰' },
  { value: 'CWC_CLINIC', label: 'Swap: Child Clinic / EPI', si: 'ළමා සායනය / එන්නත් වලට මාරු කරන්න', icon: '👶' },
  { value: 'MOH_OFFICE', label: 'Swap: MOH Office', si: 'MOH කාර්යාලයට මාරු කරන්න', icon: '🏢' },
  { value: 'CATCH_UP', label: 'Swap: Overdue Catch-up', si: 'මගහැරුණු චාරිකා සඳහා මාරු කරන්න', icon: '⚡' },
];

const NOTE_PRESETS: { en: string; si: string }[] = [
  { en: 'Full Moon Poya Day Holiday', si: 'පසළොස්වක පොහොය දින නිවාඩුව' },
  { en: 'MOH Special Review Meeting', si: 'MOH විශේෂ සමාලෝචන රැස්වීම' },
  { en: 'Annual / Casual Staff Leave', si: 'වාර්ෂික / අනියම් නිවාඩු' },
  { en: 'Special Immunization Campaign', si: 'විශේෂ එන්නත්කරණ වැඩසටහන' },
  { en: 'Emergency Field Dengue Inspection', si: 'ක්ෂේත්‍ර ඩෙංගු මර්දන වැඩසටහන' },
];

export const DayOverrideModal: React.FC<DayOverrideModalProps> = (props) => {
  if (!props.visible) return null;

  return (
    <Modal visible={props.visible} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <DayOverrideContent
        key={`${props.targetDate}_${props.existingOverride?.id || 'new'}`}
        {...props}
      />
    </Modal>
  );
};

const DayOverrideContent: React.FC<DayOverrideModalProps> = ({
  onClose,
  onSaved,
  targetDate,
  existingOverride,
  gnDivisions,
}) => {
  const { i18n } = useTranslation();
  const isSi = i18n.language === 'si';

  const [activityType, setActivityType] = useState<ActivityType>(existingOverride?.activity_type || 'HOLIDAY');
  const [gnDivision, setGnDivision] = useState<string>(existingOverride?.gn_division || gnDivisions[0] || 'Kottawa North');
  const [notes, setNotes] = useState<string>(existingOverride?.notes || '');

  // Formatted date string DD/MM/YYYY
  const parts = targetDate.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : targetDate;

  const handleSave = async () => {
    try {
      const actObj = OVERRIDE_ACTIVITIES.find((a) => a.value === activityType);
      let title = '';
      if (activityType === 'HOLIDAY') {
        title = isSi ? 'රජයේ නිවාඩු / පොහොය දිනය' : 'Public Holiday / Poya Day';
      } else if (activityType === 'LEAVE') {
        title = isSi ? 'නිලධාරී නිවාඩු දිනය' : 'PHM Staff Leave';
      } else if (activityType === 'HOME_VISIT') {
        title = isSi ? `ගෘහ චාරිකා: ${gnDivision}` : `Home Visits: ${gnDivision}`;
      } else {
        title = isSi ? actObj?.si || activityType : actObj?.label || activityType;
      }

      await upsertScheduleOverride({
        id: existingOverride?.id,
        override_date: targetDate,
        activity_type: activityType,
        gn_division: activityType === 'HOME_VISIT' ? gnDivision : null,
        title,
        notes: notes.trim() || null,
      });

      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save day override.');
    }
  };

  const handleResetToTemplate = async () => {
    Alert.alert(
      isSi ? 'සැලසුම යළි පිහිටුවන්නද?' : 'Reset to Master Template?',
      isSi
        ? 'මෙම දිනය සඳහා සිදු කළ වෙනස්කම් ඉවත් කර මුල් සතිපතා සැලසුමට නැවත සැකසීමට අවශ්‍ය බව තහවුරු කරන්න.'
        : 'Are you sure you want to discard this override and revert to the regular weekly timetable template?',
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'යළි පිහිටුවන්න' : 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearOverrideForDate(targetDate);
              onSaved();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to clear override.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {isSi ? 'දිනය වෙනස් කිරීම (Override)' : 'Modify Schedule for Date'}
              </Text>
              <Text style={styles.sheetSub}>
                📅 {formattedDate} • {isSi ? 'තාවකාලික වැඩසටහන් වෙනස් කිරීම' : 'One-time schedule adjustment'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Activity Type Selection */}
            <Text style={styles.label}>
              {isSi ? 'දිනයේ නව ක්‍රියාකාරකම තෝරන්න' : 'Select Override Activity'}
            </Text>
            <View style={styles.optionsList}>
              {OVERRIDE_ACTIVITIES.map((opt) => {
                const isSelected = activityType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setActivityType(opt.value)}
                  >
                    <Text style={styles.optionIcon}>{opt.icon}</Text>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                        {isSi ? opt.si : opt.label}
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* GN Division if Home Visit */}
            {activityType === 'HOME_VISIT' && (
              <View style={styles.sectionBox}>
                <Text style={styles.label}>
                  {isSi ? 'මාරු වන ග්‍රාම නිලධාරී කොට්ඨාසය' : 'Target GN Division'}
                </Text>
                <View style={styles.chipsRow}>
                  {gnDivisions.map((gn) => {
                    const isSelected = gnDivision === gn;
                    return (
                      <TouchableOpacity
                        key={gn}
                        style={[styles.gnChip, isSelected && styles.gnChipActive]}
                        onPress={() => setGnDivision(gn)}
                      >
                        <Text style={[styles.gnChipText, isSelected && styles.gnChipTextActive]}>
                          📍 {gn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Note Presets */}
            <Text style={styles.label}>
              {isSi ? 'කෙටි සටහන / හේතුව' : 'Reason / Note Presets'}
            </Text>
            <View style={styles.chipsRow}>
              {NOTE_PRESETS.map((np) => {
                const text = isSi ? np.si : np.en;
                const isSelected = notes === text;
                return (
                  <TouchableOpacity
                    key={np.en}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => setNotes(text)}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Note input */}
            <TextInput
              style={styles.textInput}
              placeholder={isSi ? 'අමතර සටහන් ඇතුළත් කරන්න...' : 'Enter custom reason or notes...'}
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
            />

            {/* Button Actions */}
            <View style={styles.btnRow}>
              {existingOverride && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetToTemplate}
                >
                  <Text style={styles.resetBtnText}>
                    {isSi ? 'මුල් සැලසුමට' : 'Reset to Template'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {isSi ? 'වෙනස්කම සුරකින්න' : 'Save Override'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#475569',
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 8,
  },
  optionsList: {
    gap: 8,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  optionCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  optionLabelActive: {
    color: COLORS.primaryDeep,
    fontWeight: '800',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  sectionBox: {
    marginVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  gnChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  gnChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  gnChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  gnChipTextActive: {
    color: COLORS.primaryDeep,
    fontWeight: '800',
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#CCFBF1',
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: COLORS.primaryDeep,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
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
});
