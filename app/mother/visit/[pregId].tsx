import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getPregnancy,
  getMotherById,
  createVisit,
  updatePregnancyRisk,
  createTask,
  type Pregnancy,
  type MotherWithPregnancy,
} from '@/src/db';
import { TapChipSelector, type ChipOption } from '@/src/components/TapChipSelector';
import { UrgentReferralModal } from '@/src/components/UrgentReferralModal';
import { VoiceNoteRecorder } from '@/src/components/VoiceNoteRecorder';
import { calculateRisk, type DangerSign } from '@/src/engine/riskEngine';
import { calculatePOA } from '@/src/engine/pregnancyCalc';
import { AntenatalVisitValidationSchema } from '@/src/validations';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

const DANGER_SIGN_OPTIONS: ChipOption[] = [
  { value: 'BLEEDING', label: 'Vaginal Bleeding', isDanger: true },
  { value: 'SEVERE_HEADACHE', label: 'Severe Headache / Blurred Vision', isDanger: true },
  { value: 'EDEMA', label: 'Edema (Face / Hands)', isDanger: true },
  { value: 'REDUCED_FM', label: 'Reduced Fetal Movements', isDanger: true },
  { value: 'SEVERE_ABDOMINAL_PAIN', label: 'Severe Abdominal Pain', isDanger: true },
];

const SUPPLEMENT_OPTIONS: ChipOption[] = [
  { value: 'IRON', label: 'Iron (Ferrous Fumarate)' },
  { value: 'FOLIC_ACID', label: 'Folic Acid' },
  { value: 'CALCIUM', label: 'Calcium Carbonate' },
  { value: 'THRIPOSHA', label: 'Thriposha Supplement' },
];

const VISIT_TYPES = ['HOME', 'CLINIC', 'PHONE'] as const;

export default function AntenatalVisitScreen() {
  const { pregId } = useLocalSearchParams<{ pregId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [mother, setMother] = useState<MotherWithPregnancy | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [visitDate, setVisitDate] = useState(todayStr);
  const [visitType, setVisitType] = useState<'HOME' | 'CLINIC' | 'PHONE'>('HOME');
  const [weight, setWeight] = useState('65.0');
  const [bpSystolic, setBpSystolic] = useState('120');
  const [bpDiastolic, setBpDiastolic] = useState('80');
  const [hemoglobin, setHemoglobin] = useState('11.5');
  const [dangerSigns, setDangerSigns] = useState<string[]>([]);
  const [supplements, setSupplements] = useState<string[]>(['IRON', 'FOLIC_ACID', 'CALCIUM']);
  const [notes, setNotes] = useState('');
  const [voiceNoteLocalUri, setVoiceNoteLocalUri] = useState<string | null>(null);
  const [voiceNoteDurationSec, setVoiceNoteDurationSec] = useState<number | null>(null);

  // Referral Modal State
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralReasons, setReferralReasons] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSavedRef = useRef(false);
  const navigation = useNavigation();

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (isSavedRef.current) return;
      if (!notes && bpSystolic === '120' && bpDiastolic === '80' && dangerSigns.length === 0) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        t('visit.discardTitle', 'සටහන් ඉවත් කරන්නද?'),
        t('visit.discardDesc', 'ඇතුළත් කළ සායනික දත්ත සුරැකී නොමැත. ඉවත් වීමට අවශ්‍යද?'),
        [
          { text: t('common.cancel', 'නැත'), style: 'cancel' },
          {
            text: t('common.discard', 'ඉවත් වන්න'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, notes, bpSystolic, bpDiastolic, dangerSigns, t]);

  useEffect(() => {
    async function loadInfo() {
      if (!pregId) return;
      const p = await getPregnancy(pregId);
      if (p) {
        setPregnancy(p);
        const m = await getMotherById(p.mother_id);
        setMother(m);
      }
    }
    loadInfo();
  }, [pregId]);

  const handleSaveVisit = async (bypassModal = false) => {
    if (!pregnancy || !mother) return;

    const weightNum = parseFloat(weight);
    const sysNum = parseInt(bpSystolic, 10);
    const diaNum = parseInt(bpDiastolic, 10);
    const hbNum = parseFloat(hemoglobin);

    // Validate using Zod AntenatalVisitValidationSchema
    const validation = AntenatalVisitValidationSchema.safeParse({
      visitDate: visitDate.trim(),
      bpSystolic: isNaN(sysNum) ? undefined : sysNum,
      bpDiastolic: isNaN(diaNum) ? undefined : diaNum,
      weightKg: isNaN(weightNum) ? undefined : weightNum,
      hemoglobin: isNaN(hbNum) ? undefined : hbNum,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] || 'form');
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      const firstError = validation.error.issues[0]?.message || 'Please check vital measurements';
      Alert.alert(t('common.error', 'Validation Error'), firstError);
      return;
    }

    setErrors({});

    // Parse chronic conditions
    let chronicList: string[] = [];
    try {
      chronicList = JSON.parse(mother.chronic_conditions_json || '[]');
    } catch {
      chronicList = [];
    }

    // Run On-Device Clinical Risk Calculation
    const riskResult = calculateRisk({
      dangerSigns: dangerSigns as DangerSign[],
      isFertilityTreatment: mother.fertility_treatment_history === 1,
      isPreciousPregnancy: pregnancy.is_precious_pregnancy === 1,
      prevMiscarriages: mother.prev_miscarriages_count,
      prevStillbirths: mother.prev_stillbirths_count,
      prevCSections: mother.prev_c_sections_count,
      chronicConditions: chronicList,
      bpSystolic: sysNum,
      bpDiastolic: diaNum,
      hemoglobin: isNaN(hbNum) ? undefined : hbNum,
    });

    // If Urgent Referral Required and not yet acknowledged
    if (!bypassModal && riskResult.urgentReferralRequired) {
      setReferralReasons(riskResult.reasons);
      setShowReferralModal(true);
      return;
    }

    try {
      setIsSubmitting(true);

      // Compute current POA in weeks
      const lrmp = pregnancy.lrmp_date ? new Date(pregnancy.lrmp_date) : new Date();
      const poa = calculatePOA(lrmp);

      // Calculate Next Visit Date based on Risk Level (RED=7d, YELLOW=14d, GREEN=28d)
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + riskResult.recommendedFollowUpDays);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      // 1. Create Antenatal Visit Record
      await createVisit({
        pregnancy_id: pregnancy.id,
        visit_date: visitDate,
        visit_type: visitType,
        poa_weeks: poa.poaWeeks + poa.poaDays / 7,
        weight_kg: isNaN(weightNum) ? undefined : weightNum,
        bp_systolic: sysNum,
        bp_diastolic: diaNum,
        hemoglobin: isNaN(hbNum) ? undefined : hbNum,
        danger_signs: dangerSigns,
        supplements: supplements,
        notes: notes.trim(),
        next_visit_date: nextDateStr,
        voice_note_local_uri: voiceNoteLocalUri ?? undefined,
        voice_note_duration_sec: voiceNoteDurationSec ?? undefined,
      });

      // 2. Update Pregnancy Risk Level & Score
      await updatePregnancyRisk(
        pregnancy.id,
        riskResult.level,
        riskResult.score,
        riskResult.reasons
      );

      // 3. Auto-Create Next Scheduled Task in Task Repo
      await createTask({
        target_type: 'MOTHER',
        target_id: mother.id,
        task_type: riskResult.urgentReferralRequired ? 'VOG_REFERRAL' : 'HOME_VISIT',
        priority: riskResult.level === 'RED' ? 'URGENT' : riskResult.level === 'YELLOW' ? 'HIGH' : 'NORMAL',
        due_date: nextDateStr,
        notes: `Follow-up visit (${riskResult.level} Risk). Recalculated score: ${riskResult.score}`,
      });

      isSavedRef.current = true;
      Alert.alert(
        t('common.success', 'සාර්ථකයි'),
        `Visit logged successfully. Risk Level: ${riskResult.level}. Next visit scheduled in ${riskResult.recommendedFollowUpDays} days (${nextDateStr}).`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert(t('common.error', 'දෝෂයකි'), e?.message || 'Failed to save antenatal visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* 1. MOTHER SUMMARY BAR */}
      {mother && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryName}>👩 {mother.full_name}</Text>
          <Text style={styles.summarySub}>
            NIC: {mother.nic || 'N/A'} • GN: {mother.gn_division || 'General Area'}
          </Text>
        </View>
      )}

      {/* 2. VISIT TYPE & DATE */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>Visit Logistics</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('visit.visitType', 'Visit Type')}</Text>
          <View style={styles.typeRow}>
            {VISIT_TYPES.map((vt) => (
              <TouchableOpacity
                key={vt}
                activeOpacity={0.7}
                style={[styles.typeChip, visitType === vt && styles.typeChipActive]}
                onPress={() => setVisitType(vt)}
              >
                <Text style={[styles.typeText, visitType === vt && styles.typeTextActive]}>
                  {vt === 'HOME' ? '🏠 Home' : vt === 'CLINIC' ? '🏥 Clinic' : '📞 Phone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Visit Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, errors.visitDate ? styles.inputError : null]}
            value={visitDate}
            onChangeText={(v) => {
              setVisitDate(v);
              clearError('visitDate');
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textTertiary}
          />
          {errors.visitDate ? (
            <Text style={styles.errorText}>⚠ {errors.visitDate}</Text>
          ) : null}
        </View>
      </View>

      {/* 3. VITAL MEASUREMENTS (WEIGHT, BP, HEMOGLOBIN) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>Physical & Lab Measurements</Text>
        </View>

        {/* BP Systolic / Diastolic with 140/90 Warning Banner */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Blood Pressure (mmHg) • Cutoff: 140/90 *
          </Text>
          <View style={styles.bpRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Systolic</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.bpSystolic ? styles.inputError : parseInt(bpSystolic, 10) >= 140 ? styles.inputWarning : null,
                ]}
                value={bpSystolic}
                onChangeText={(v) => {
                  setBpSystolic(v);
                  clearError('bpSystolic');
                }}
                keyboardType="numeric"
                placeholder="120"
                placeholderTextColor={COLORS.textTertiary}
              />
              {errors.bpSystolic ? (
                <Text style={styles.errorText}>⚠ {errors.bpSystolic}</Text>
              ) : null}
            </View>
            <Text style={styles.bpSlash}>/</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Diastolic</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.bpDiastolic ? styles.inputError : parseInt(bpDiastolic, 10) >= 90 ? styles.inputWarning : null,
                ]}
                value={bpDiastolic}
                onChangeText={(v) => {
                  setBpDiastolic(v);
                  clearError('bpDiastolic');
                }}
                keyboardType="numeric"
                placeholder="80"
                placeholderTextColor={COLORS.textTertiary}
              />
              {errors.bpDiastolic ? (
                <Text style={styles.errorText}>⚠ {errors.bpDiastolic}</Text>
              ) : null}
            </View>
          </View>
          {(parseInt(bpSystolic, 10) >= 140 || parseInt(bpDiastolic, 10) >= 90) && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                ⚠️ High blood pressure detected (≥ 140/90). Triggers Auto-RED Risk.
              </Text>
            </View>
          )}
        </View>

        {/* Maternal Weight with Steppers */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('visit.weight', 'Maternal Weight (kg)')}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stepBtn}
              onPress={() => {
                const w = parseFloat(weight) || 60;
                setWeight(Math.max(30, w - 0.5).toFixed(1));
                clearError('weightKg');
              }}
            >
              <Text style={styles.stepBtnText}>-0.5</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, styles.stepperInput, errors.weightKg ? styles.inputError : null]}
              value={weight}
              onChangeText={(v) => {
                setWeight(v);
                clearError('weightKg');
              }}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stepBtn}
              onPress={() => {
                const w = parseFloat(weight) || 60;
                setWeight((w + 0.5).toFixed(1));
                clearError('weightKg');
              }}
            >
              <Text style={styles.stepBtnText}>+0.5</Text>
            </TouchableOpacity>
          </View>
          {errors.weightKg ? (
            <Text style={styles.errorText}>⚠ {errors.weightKg}</Text>
          ) : null}
        </View>

        {/* Hemoglobin */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t('visit.hemoglobin', 'Hemoglobin (g/dL)')} • Normal &gt; 11.0, Severe &lt; 8.0
          </Text>
          <TextInput
            style={[
              styles.input,
              errors.hemoglobin ? styles.inputError : parseFloat(hemoglobin) < 8.0 ? styles.inputWarning : null,
            ]}
            value={hemoglobin}
            onChangeText={(v) => {
              setHemoglobin(v);
              clearError('hemoglobin');
            }}
            keyboardType="decimal-pad"
            placeholder="11.5"
            placeholderTextColor={COLORS.textTertiary}
          />
          {errors.hemoglobin ? (
            <Text style={styles.errorText}>⚠ {errors.hemoglobin}</Text>
          ) : null}
          {parseFloat(hemoglobin) < 8.0 && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                ⚠️ Severe anemia detected (&lt; 8.0 g/dL). Auto-RED Risk & Immediate Referral.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 4. DANGER SIGNS (TAP-CHIPS) */}
      <View style={[styles.card, styles.cardDanger]}>
        <Text style={[styles.cardTitle, { color: COLORS.risk.red.text }]}>
          🚨 {t('visit.dangerSigns', 'Danger Signs (Red Alert Triggers)')}
        </Text>
        <Text style={styles.dangerSub}>
          Tap any sign present today. Automatically triggers urgent referral.
        </Text>
        <TapChipSelector
          options={DANGER_SIGN_OPTIONS}
          selectedValues={dangerSigns}
          onChange={setDangerSigns}
        />
      </View>

      {/* 5. SUPPLEMENTS GIVEN */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>{t('visit.supplements', 'Supplements Given Today')}</Text>
        </View>
        <TapChipSelector
          options={SUPPLEMENT_OPTIONS}
          selectedValues={supplements}
          onChange={setSupplements}
        />
      </View>

      {/* 6. PHM CLINICAL NOTES */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>{t('visit.notes', 'Midwife Notes & Observations')}</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter clinical observations, fetal movement notes, diet advice..."
          placeholderTextColor={COLORS.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Offline Voice Note Recorder */}
        <VoiceNoteRecorder
          existingUri={voiceNoteLocalUri}
          existingDurationSec={voiceNoteDurationSec}
          onRecorded={(uri, duration) => {
            setVoiceNoteLocalUri(uri);
            setVoiceNoteDurationSec(duration);
          }}
          onDeleted={() => {
            setVoiceNoteLocalUri(null);
            setVoiceNoteDurationSec(null);
          }}
        />
      </View>

      {/* 7. SAVE BUTTON */}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isSubmitting}
        style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
        onPress={() => handleSaveVisit(false)}
      >
        <Text style={styles.saveBtnText}>
          {isSubmitting ? 'Saving...' : `✓ ${t('visit.saveVisit', 'Save Antenatal Visit')}`}
        </Text>
      </TouchableOpacity>

      {/* URGENT REFERRAL MODAL */}
      <UrgentReferralModal
        visible={showReferralModal}
        reasons={referralReasons}
        motherName={mother?.full_name}
        phone={mother?.phone}
        onDismiss={() => setShowReferralModal(false)}
        onAcknowledge={() => {
          setShowReferralModal(false);
          handleSaveVisit(true); // Proceed with saving after acknowledgment
        }}
      />
      </ScrollView>
    </KeyboardAvoidingView>
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
  summaryBar: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: 16,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  summarySub: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cardDanger: {
    borderColor: COLORS.risk.red.border,
    backgroundColor: COLORS.risk.red.bg,
  },
  cardHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
  },
  dangerSub: {
    fontSize: 12,
    color: COLORS.risk.red.text,
    fontWeight: '500',
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceSubtle,
  },
  inputWarning: {
    borderColor: COLORS.risk.red.border,
    backgroundColor: COLORS.risk.red.bg,
    color: COLORS.risk.red.accent,
    fontWeight: '700',
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeTextActive: {
    color: COLORS.textWhite,
    fontWeight: '700',
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bpSlash: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textTertiary,
    marginTop: 18,
  },
  alertBox: {
    backgroundColor: COLORS.risk.red.bg,
    padding: 8,
    borderRadius: RADIUS.xs,
    marginTop: 6,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.risk.red.text,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 46,
    minHeight: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.floating,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 15,
  },
});
