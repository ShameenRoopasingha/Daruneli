import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getChildById,
  getGrowthRecords,
  createGrowthRecord,
  updateChildGrowthFlag,
  updateChildNutrition,
  createTask,
  type Child,
} from '@/src/db';
import { TapChipSelector, type ChipOption } from '@/src/components/TapChipSelector';
import {
  analyzeGrowth,
  calculateAgeMonths,
  getNutritionStatus,
  type GrowthRecord,
} from '@/src/engine/growthAnalyzer';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

const MILESTONE_OPTIONS: ChipOption[] = [
  { value: 'HEAD_CONTROL', label: 'Holds Head Steady (3-4m)' },
  { value: 'ROLLS_OVER', label: 'Rolls Over (4-6m)' },
  { value: 'SITS_WITHOUT_SUPPORT', label: 'Sits Without Support (6-8m)' },
  { value: 'STANDS_WITH_SUPPORT', label: 'Stands with Support (9-10m)' },
  { value: 'WALKS_ALONE', label: 'Walks Alone (12-15m)' },
  { value: 'SAYS_WORDS', label: 'Speaks 2-3 Single Words (12-18m)' },
  { value: 'RUNS_WELL', label: 'Runs Well (2-3 yrs)' },
  { value: 'SPEAKS_SENTENCES', label: 'Speaks Short Sentences (2-3 yrs)' },
];

const SUPPLEMENT_OPTIONS: ChipOption[] = [
  { value: 'VITAMIN_A', label: 'Vitamin A Megadose' },
  { value: 'DEWORMING', label: 'Deworming (Mebendazole)' },
  { value: 'THRIPOSHA', label: 'Thriposha Packets' },
  { value: 'MICRONUTRIENT_POWDER', label: 'MNP (Nutrimix)' },
];

export default function LogGrowthScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [child, setChild] = useState<Child | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const [recordedDate, setRecordedDate] = useState(todayStr);
  const [weight, setWeight] = useState('10.0');
  const [height, setHeight] = useState('80.0');
  const [milestones, setMilestones] = useState<string[]>([]);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadChild() {
      if (!id) return;
      const c = await getChildById(id);
      if (c) {
        setChild(c);
        // Pre-fill approximate weight from previous records
        const recs = await getGrowthRecords(id);
        if (recs.length > 0) {
          const last = recs[recs.length - 1];
          if (last.weight_kg) setWeight(last.weight_kg.toString());
          if (last.height_cm) setHeight(last.height_cm.toString());
        }
      }
    }
    loadChild();
  }, [id]);

  const handleSaveGrowth = async () => {
    if (!child) return;

    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Required', 'Please enter a valid weight in kg');
      return;
    }

    try {
      setIsSubmitting(true);

      const dob = new Date(child.dob);
      const ageMonths = calculateAgeMonths(dob, new Date(recordedDate));

      // 1. Fetch previous growth records to feed into the growthAnalyzer
      const prevRecords = await getGrowthRecords(child.id);
      const mappedPrev: GrowthRecord[] = prevRecords.map((r) => ({
        recordedDate: new Date(r.recorded_date),
        ageMonths: r.age_months,
        weightKg: r.weight_kg || 0,
        heightCm: r.height_cm || undefined,
      }));

      // Add the new record
      const allRecords: GrowthRecord[] = [
        ...mappedPrev,
        {
          recordedDate: new Date(recordedDate),
          ageMonths,
          weightKg: weightNum,
          heightCm: isNaN(heightNum) ? undefined : heightNum,
        },
      ];

      // 2. Run Growth Analyzer Engine
      const analysis = analyzeGrowth(allRecords);
      const nutrition = getNutritionStatus(weightNum, ageMonths, child.gender);

      // 3. Save Growth Record
      await createGrowthRecord({
        child_id: child.id,
        recorded_date: recordedDate,
        age_months: ageMonths,
        weight_kg: weightNum,
        height_cm: isNaN(heightNum) ? undefined : heightNum,
        milestones,
        supplements,
      });

      // 4. Update Nutrition Status on Child
      await updateChildNutrition(child.id, nutrition);

      // 5. Update Growth Faltering Flag & Auto-Create Urgent Task if faltering!
      await updateChildGrowthFlag(child.id, analysis.isFaltering);

      if (analysis.isFaltering) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 7);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        await createTask({
          target_type: 'CHILD',
          target_id: child.id,
          task_type: 'HOME_VISIT',
          priority: 'URGENT',
          due_date: nextDateStr,
          notes: `Growth faltering alert: ${analysis.message}. Evaluate supplementary feeding (Thriposha).`,
        });

        Alert.alert(
          '⚠️ Growth Faltering Detected',
          `${analysis.message}\nNutrition Status: ${nutrition}.\n\nAn URGENT follow-up task has been scheduled for this child.`,
          [{ text: 'View Child Profile', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Record Saved',
          `Growth record logged successfully.\nNutrition Status: ${nutrition}.\nTrend: ${analysis.trend}.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save growth record');
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
      {/* 1. CHILD SUMMARY BAR */}
      {child && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryName}>
            {child.gender === 'M' ? '👦' : '👧'} {child.full_name}
          </Text>
          <Text style={styles.summarySub}>
            DOB: {child.dob} • Mother: {child.mother_name || 'N/A'}
          </Text>
        </View>
      )}

      {/* 2. DATE & MEASUREMENTS */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>Monthly Growth Measurements</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Recorded Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={recordedDate}
            onChangeText={setRecordedDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Weight with Stepper */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('child.weightKg', 'Weight (kg)')} *</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stepBtn}
              onPress={() => {
                const w = parseFloat(weight) || 10.0;
                setWeight(Math.max(1.0, w - 0.1).toFixed(2));
              }}
            >
              <Text style={styles.stepBtnText}>-0.1</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, styles.stepperInput]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stepBtn}
              onPress={() => {
                const w = parseFloat(weight) || 10.0;
                setWeight((w + 0.1).toFixed(2));
              }}
            >
              <Text style={styles.stepBtnText}>+0.1</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Height with Stepper */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('child.heightCm', 'Height / Length (cm)')}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stepBtn}
              onPress={() => {
                const h = parseFloat(height) || 75.0;
                setHeight(Math.max(30.0, h - 0.5).toFixed(1));
              }}
            >
              <Text style={styles.stepBtnText}>-0.5</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, styles.stepperInput]}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stepBtn}
              onPress={() => {
                const h = parseFloat(height) || 75.0;
                setHeight((h + 0.5).toFixed(1));
              }}
            >
              <Text style={styles.stepBtnText}>+0.5</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. DEVELOPMENTAL MILESTONES (AGE APPROPRIATE TAP-CHIPS) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>
            {t('child.milestones', 'Developmental Milestones Achieved')}
          </Text>
        </View>
        <TapChipSelector
          options={MILESTONE_OPTIONS}
          selectedValues={milestones}
          onChange={setMilestones}
        />
      </View>

      {/* 4. NUTRITIONAL SUPPLEMENTS GIVEN */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cardTitle}>
            {t('child.supplementsGiven', 'Nutritional Supplements Given Today')}
          </Text>
        </View>
        <TapChipSelector
          options={SUPPLEMENT_OPTIONS}
          selectedValues={supplements}
          onChange={setSupplements}
        />
      </View>

      {/* 5. SUBMIT ACTION */}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isSubmitting}
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSaveGrowth}
      >
        <Text style={styles.submitBtnText}>
          {isSubmitting ? 'Evaluating...' : `✓ ${t('child.saveGrowth', 'Save & Analyze Growth')}`}
        </Text>
      </TouchableOpacity>
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
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.floating,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 15,
  },
});
