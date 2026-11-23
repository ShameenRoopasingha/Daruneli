import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { markDelivered, createChild, createImmunization, createGrowthRecord } from '../db';
import { generateEPISchedule } from '../engine/epiScheduler';
import { ChildFormValidationSchema } from '../validations';
import { COLORS, RADIUS, SHADOWS } from '../theme';

interface DeliveryModalProps {
  visible: boolean;
  pregnancyId: string;
  motherId: string;
  motherName: string;
  onClose: () => void;
  onSuccess: (newChildId: string) => void;
}

function toDmy(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDmyToIso(str: string): { iso: string; date: Date } {
  const trimmed = str.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return { iso, date };
  }
  const date = new Date(trimmed);
  const iso = isNaN(date.getTime()) ? trimmed : date.toISOString().split('T')[0];
  return { iso, date };
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  visible,
  pregnancyId,
  motherId,
  motherName,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isSi = i18n.language === 'si';

  const [deliveryDate, setDeliveryDate] = useState(() => toDmy(new Date()));
  const [deliveryMode, setDeliveryMode] = useState<'VAGINAL' | 'CS' | 'INSTRUMENTAL'>('VAGINAL');
  const [babyName, setBabyName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [birthWeight, setBirthWeight] = useState('3.0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = () => {
    const { iso: deliveryIso } = parseDmyToIso(deliveryDate);
    const weightNum = parseFloat(birthWeight);

    // Validate using Zod ChildFormValidationSchema
    const validation = ChildFormValidationSchema.safeParse({
      fullName: babyName.trim(),
      dob: deliveryIso,
      gender: gender,
      birthWeightKg: isNaN(weightNum) ? null : weightNum,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] || 'form');
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      const firstError = validation.error.issues[0]?.message || 'Please check child details';
      Alert.alert(isSi ? 'දෝෂයකි' : 'Validation Error', firstError);
      return;
    }

    setErrors({});

    const modeLabel = deliveryMode === 'CS' ? 'Caesarean (CS)' : deliveryMode === 'INSTRUMENTAL' ? 'Instrumental' : 'Normal Vaginal';
    const modeLabelSi = deliveryMode === 'CS' ? 'සිසේරියන් (CS)' : deliveryMode === 'INSTRUMENTAL' ? 'උපකරණ ආධාරක' : 'ස්වභාවික ප්‍රසූතිය';

    Alert.alert(
      isSi ? 'දරු ප්‍රසූතිය සටහන් කිරීම තහවුරු කරන්න' : 'Confirm Childbirth Record',
      isSi
        ? `${motherName} මවගේ ප්‍රසූතිය:\n\n• දරුවාගේ නම: ${babyName.trim()}\n• උපන් දිනය: ${deliveryDate}\n• ලිංගය: ${gender === 'M' ? 'පිරිමි 👦' : 'ගැහැණු 👧'}\n• උපත් බර: ${weightNum} kg\n• ප්‍රසූති ක්‍රමය: ${modeLabelSi}\n\nමෙමගින් දරුවාගේ CHDR සටහන් සහ එන්නත් කාලසටහන ස්ථිරව නිර්මාණය කෙරේ. තහවුරු කරන්නද?`
        : `Confirm recording birth for mother ${motherName}:\n\n• Baby Name: ${babyName.trim()}\n• DOB: ${deliveryDate}\n• Gender: ${gender === 'M' ? 'Male 👦' : 'Female 👧'}\n• Birth Weight: ${weightNum} kg\n• Mode: ${modeLabel}\n\nThis will permanently update pregnancy status to DELIVERED and initialize child CHDR records. Proceed?`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'තහවුරු කරන්න' : 'Confirm & Save',
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const { iso: deliveryIso, date: dobDate } = parseDmyToIso(deliveryDate);

              // 1. Mark pregnancy as DELIVERED
              await markDelivered(pregnancyId, deliveryIso, deliveryMode);

              // 2. Create linked child
              const childId = await createChild({
                mother_id: motherId,
                pregnancy_id: pregnancyId,
                full_name: babyName.trim(),
                dob: deliveryIso,
                gender: gender,
                birth_weight_kg: weightNum,
              });

              // 3. Auto-generate full EPI schedule
              const schedule = generateEPISchedule(dobDate);

              for (const item of schedule) {
                await createImmunization({
                  child_id: childId,
                  vaccine_code: item.vaccineCode,
                  vaccine_name: item.vaccineName,
                  scheduled_date: item.scheduledDate.toISOString().split('T')[0],
                });
              }

              // 4. Record birth weight in growth records
              await createGrowthRecord({
                child_id: childId,
                recorded_date: deliveryDate,
                age_months: 0,
                weight_kg: weightNum,
                milestones: ['BIRTH_CRY', 'NORMAL_REFLEXES'],
                supplements: [],
              });

              Alert.alert(
                isSi ? 'ප්‍රසූතිය සටහන් විය' : 'Delivery Recorded',
                isSi
                  ? 'දරුවාගේ සෞඛ්‍ය සංවර්ධන වාර්තාව (CHDR) සහ ජාතික එන්නත් කාලසටහන සාර්ථකව නිර්මාණය විය.'
                  : 'Child health record (CHDR) and national immunization schedule created.',
                [
                  {
                    text: isSi ? 'දරුවාගේ පැතිකඩ විවෘත කරන්න' : 'Open Child Profile',
                    onPress: () => onSuccess(childId),
                  },
                ]
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to record delivery');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>👶</Text>
              </View>
              <Text style={styles.title}>{t('mother.markDelivered', 'Mark as Delivered')}</Text>
              <Text style={styles.subtitle}>Mother: {motherName}</Text>
            </View>

            {/* Delivery Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('mother.deliveryDate', 'Delivery Date (DD/MM/YYYY)')} *</Text>
              <TextInput
                style={[styles.input, errors.dob ? styles.inputError : null]}
                value={deliveryDate}
                onChangeText={(v) => {
                  setDeliveryDate(v);
                  clearError('dob');
                }}
                placeholder="DD/MM/YYYY"
              />
              {errors.dob ? (
                <Text style={styles.errorText}>⚠ {errors.dob}</Text>
              ) : null}
            </View>

            {/* Delivery Mode */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('mother.deliveryMode', 'Delivery Mode')}</Text>
              <View style={styles.modeRow}>
                {(
                  [
                    { key: 'VAGINAL', label: 'Vaginal' },
                    { key: 'CS', label: 'C-Section' },
                    { key: 'INSTRUMENTAL', label: 'Instrumental' },
                  ] as const
                ).map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    activeOpacity={0.75}
                    onPress={() => setDeliveryMode(m.key)}
                    style={[styles.modeChip, deliveryMode === m.key && styles.modeChipSelected]}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        deliveryMode === m.key && styles.modeChipTextSelected,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Baby Full Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('mother.babyName', "Baby's Full Name")} *</Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : null]}
                value={babyName}
                onChangeText={(v) => {
                  setBabyName(v);
                  clearError('fullName');
                }}
                placeholder="e.g. Baby of Nimali Perera"
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>⚠ {errors.fullName}</Text>
              ) : null}
            </View>

            {/* Gender */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('mother.babyGender', "Baby's Gender")} *</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setGender('M');
                    clearError('gender');
                  }}
                  style={[styles.genderChip, gender === 'M' && styles.genderChipMale]}
                >
                  <Text style={[styles.genderChipText, gender === 'M' && styles.genderTextActiveMale]}>
                    👦 {t('child.male', 'Male')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setGender('F');
                    clearError('gender');
                  }}
                  style={[styles.genderChip, gender === 'F' && styles.genderChipFemale]}
                >
                  <Text style={[styles.genderChipText, gender === 'F' && styles.genderTextActiveFemale]}>
                    👧 {t('child.female', 'Female')}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.gender ? (
                <Text style={styles.errorText}>⚠ {errors.gender}</Text>
              ) : null}
            </View>

            {/* Birth Weight */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('mother.birthWeight', 'Birth Weight (kg)')} *</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const w = parseFloat(birthWeight) || 3.0;
                    setBirthWeight((Math.max(0.5, w - 0.1)).toFixed(2));
                    clearError('birthWeightKg');
                  }}
                >
                  <Text style={styles.stepBtnText}>-</Text>
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, styles.stepperInput, errors.birthWeightKg ? styles.inputError : null]}
                  value={birthWeight}
                  onChangeText={(v) => {
                    setBirthWeight(v);
                    clearError('birthWeightKg');
                  }}
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    const w = parseFloat(birthWeight) || 3.0;
                    setBirthWeight((w + 0.1).toFixed(2));
                    clearError('birthWeightKg');
                  }}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {errors.birthWeightKg ? (
                <Text style={styles.errorText}>⚠ {errors.birthWeightKg}</Text>
              ) : null}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSubmitting}
                style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'Recording...' : '✓ Complete Delivery & Create CHDR'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 22,
    width: '100%',
    maxHeight: '90%',
    ...SHADOWS.modal,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceSubtle,
  },
  inputError: {
    borderColor: COLORS.risk.red.accent,
    backgroundColor: COLORS.risk.red.bg,
  },
  errorText: {
    color: COLORS.risk.red.text,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeChipTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
  },
  genderChipMale: {
    borderColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
  },
  genderChipFemale: {
    borderColor: '#F472B6',
    backgroundColor: '#FDF2F8',
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  genderTextActiveMale: {
    fontWeight: '800',
    color: '#0284C7',
  },
  genderTextActiveFemale: {
    fontWeight: '800',
    color: '#DB2777',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textTertiary,
    fontWeight: '600',
    fontSize: 13,
  },
});
