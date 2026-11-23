import React, { useState } from 'react';
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
import { COLORS } from '../theme';
import { formatDate } from '../utils/dateFormat';
import type { AutoPopulatedItem } from '../db/repositories/scheduleRepo';

interface ManualRescheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onReschedule: (item: AutoPopulatedItem, targetDate: string) => Promise<void>;
  item: AutoPopulatedItem | null;
  weekDays: { dateKey: string; dayIndex: number; dayNum: number }[];
}

const SHORT_WEEKDAYS = [
  { dayIndex: 1, en: 'Mon', si: 'සඳුදා' },
  { dayIndex: 2, en: 'Tue', si: 'අඟහරුවාදා' },
  { dayIndex: 3, en: 'Wed', si: 'බදාදා' },
  { dayIndex: 4, en: 'Thu', si: 'බ්‍රහස්පතින්දා' },
  { dayIndex: 5, en: 'Fri', si: 'සිකුරාදා' },
  { dayIndex: 6, en: 'Sat', si: 'සෙනසුරාදා' },
  { dayIndex: 0, en: 'Sun', si: 'ඉරිදා' },
];

export const ManualRescheduleModal: React.FC<ManualRescheduleModalProps> = ({
  visible,
  onClose,
  onReschedule,
  item,
  weekDays,
}) => {
  const { i18n } = useTranslation();
  const isSi = i18n.language === 'si';

  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(
    weekDays[0]?.dateKey || new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState<boolean>(false);

  if (!visible || !item) return null;

  // Add next week Saturday option
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  const handleConfirm = () => {
    Alert.alert(
      isSi ? 'චාරිකාව මාරු කිරීම තහවුරු කරන්න' : 'Confirm Rescheduling Visit',
      isSi
        ? `${item.name} සඳහා වූ චාරිකාව ${formatDate(selectedTargetDate)} දිනට මාරු කිරීමට ඔබට අවශ්‍යද?`
        : `Are you sure you want to move the scheduled visit for ${item.name} to ${formatDate(selectedTargetDate)}?`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'මාරු කරන්න' : 'Confirm Move',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await onReschedule(item, selectedTargetDate);
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not reschedule visit.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                📅 {isSi ? 'චාරිකාව වෙනත් දිනයකට මාරු කරන්න' : 'Reschedule Home Visit'}
              </Text>
              <Text style={styles.sub}>{item.name} • 📍 {item.gnDivision || 'General Area'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeading}>
              {isSi ? 'මාරු කිරීමට අවශ්‍ය දිනය තෝරන්න:' : 'Select Target Date:'}
            </Text>

            {/* This week's days */}
            <View style={styles.daysList}>
              {weekDays.map((d) => {
                const wd = SHORT_WEEKDAYS.find((w) => w.dayIndex === d.dayIndex);
                const isSelected = selectedTargetDate === d.dateKey;
                const parts = d.dateKey.split('-');
                const displayFormatted = `${parts[2]}/${parts[1]}`;

                return (
                  <TouchableOpacity
                    key={d.dateKey}
                    style={[styles.dayCard, isSelected && styles.dayCardActive]}
                    onPress={() => setSelectedTargetDate(d.dateKey)}
                  >
                    <View style={styles.dayCardLeft}>
                      <Text style={[styles.dayCardName, isSelected && styles.dayCardNameActive]}>
                        {isSi ? wd?.si : wd?.en}
                      </Text>
                      <Text style={[styles.dayCardDate, isSelected && styles.dayCardDateActive]}>
                        {displayFormatted}
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Quick Next Week Option */}
              <TouchableOpacity
                style={[styles.dayCard, selectedTargetDate === nextWeekStr && styles.dayCardActive]}
                onPress={() => setSelectedTargetDate(nextWeekStr)}
              >
                <View style={styles.dayCardLeft}>
                  <Text style={[styles.dayCardName, selectedTargetDate === nextWeekStr && styles.dayCardNameActive]}>
                    ⏩ {isSi ? 'ලබන සතියට (+7 දින)' : 'Next Week (+7 Days)'}
                  </Text>
                  <Text style={[styles.dayCardDate, selectedTargetDate === nextWeekStr && styles.dayCardDateActive]}>
                    {formatDate(nextWeekStr)}
                  </Text>
                </View>
                <View style={[styles.radioCircle, selectedTargetDate === nextWeekStr && styles.radioCircleActive]}>
                  {selectedTargetDate === nextWeekStr && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>{isSi ? 'අවලංගු කරන්න' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm} disabled={loading}>
                <Text style={styles.applyBtnText}>
                  {loading
                    ? isSi ? 'මාරු කරමින්...' : 'Saving...'
                    : isSi ? 'මාරු කිරීම තහවුරු කරන්න' : 'Confirm Reschedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    maxHeight: '85%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  sub: {
    fontSize: 12,
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
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
  },
  daysList: {
    gap: 8,
    marginBottom: 16,
  },
  dayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dayCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  dayCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayCardName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  dayCardNameActive: {
    color: COLORS.primaryDeep,
    fontWeight: '800',
  },
  dayCardDate: {
    fontSize: 12,
    color: '#64748B',
  },
  dayCardDateActive: {
    color: COLORS.primary,
    fontWeight: '600',
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
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
