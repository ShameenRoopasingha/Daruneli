import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createFamily, createMother, createPregnancy } from '@/src/db';
import { TapChipSelector, type ChipOption } from '@/src/components/TapChipSelector';
import { calculateRisk, type DangerSign } from '@/src/engine/riskEngine';
import { calculateEDD } from '@/src/engine/pregnancyCalc';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

const CHRONIC_OPTIONS: ChipOption[] = [
  { value: 'HEART_DISEASE', label: 'Heart Disease', isDanger: true },
  { value: 'DIABETES', label: 'Diabetes Mellitus', isDanger: true },
  { value: 'HYPERTENSION', label: 'Hypertension', isDanger: true },
  { value: 'THYROID', label: 'Thyroid Disorder' },
  { value: 'PCOS', label: 'PCOS' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GN_DIVISIONS = ['Kottawa North', 'Kottawa South', 'Maharagama East', 'Maharagama West'];

export default function RegisterMotherScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Family Info
  const [familyNo, setFamilyNo] = useState('');
  const [gnDivision, setGnDivision] = useState(GN_DIVISIONS[0]);
  const [address, setAddress] = useState('');
  const [husbandName, setHusbandName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Mother Info
  const [fullName, setFullName] = useState('');
  const [nic, setNic] = useState('');
  const [dob, setDob] = useState('1995-01-01');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [isFertilityTreatment, setIsFertilityTreatment] = useState(false);
  const [isPlanningPregnancy, setIsPlanningPregnancy] = useState(false);

  // Obstetric History
  const [prevMiscarriages, setPrevMiscarriages] = useState(0);
  const [prevStillbirths, setPrevStillbirths] = useState(0);
  const [prevCSections, setPrevCSections] = useState(0);

  // Pregnancy Status
  const [isPregnant, setIsPregnant] = useState(true);
  const [lrmpDate, setLrmpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 70); // default ~10 weeks
    return d.toISOString().split('T')[0];
  });
  const [gravida, setGravida] = useState(1);
  const [para, setPara] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter mother full name');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create Family record
      const familyId = await createFamily({
        eligible_family_no: familyNo.trim() || `EF/${Date.now().toString().slice(-4)}`,
        gn_division: gnDivision,
        address: address.trim(),
        husband_name: husbandName.trim(),
        emergency_phone: emergencyPhone.trim(),
        residency_status: 'ACTIVE',
      });

      // 2. Create Mother record
      const motherId = await createMother({
        family_id: familyId,
        full_name: fullName.trim(),
        nic: nic.trim(),
        dob: dob.trim(),
        phone: phone.trim(),
        blood_group: bloodGroup,
        chronic_conditions: chronicConditions,
        fertility_treatment_history: isFertilityTreatment,
        prev_miscarriages_count: prevMiscarriages,
        prev_stillbirths_count: prevStillbirths,
        prev_c_sections_count: prevCSections,
        planning_pregnancy: isPlanningPregnancy,
      });

      // 3. If currently pregnant, create Pregnancy record with clinical risk scoring
      if (isPregnant) {
        const lrmp = new Date(lrmpDate);
        const edd = calculateEDD(lrmp);
        const eddStr = edd.toISOString().split('T')[0];

        // Compute maternal age
        const birthDate = new Date(dob);
        const maternalAge = Math.floor(
          (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );

        // Run On-Device Risk Engine
        const riskResult = calculateRisk({
          dangerSigns: [] as DangerSign[],
          isFertilityTreatment,
          isPreciousPregnancy: isFertilityTreatment || prevMiscarriages >= 2,
          prevMiscarriages,
          prevStillbirths,
          prevCSections,
          chronicConditions,
          maternalAge,
        });

        await createPregnancy({
          mother_id: motherId,
          gravida,
          para,
          lrmp_date: lrmpDate,
          edd_date: eddStr,
          is_precious_pregnancy: isFertilityTreatment || prevMiscarriages >= 2,
          risk_level: riskResult.level,
          risk_score: riskResult.score,
          risk_factors_json: JSON.stringify(riskResult.reasons),
        });
      }

      Alert.alert(
        'Registration Complete',
        `${fullName} has been registered successfully with digital records.`,
        [
          {
            text: 'Open Profile',
            onPress: () => router.replace(`/mother/${motherId}` as any),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.message || 'Failed to save mother registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. FAMILY & DEMOGRAPHIC INFO */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.sectionTitle}>Eligible Family & Location</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.familyNo', 'Eligible Family No')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. EF/KOT/012"
            placeholderTextColor={COLORS.textTertiary}
            value={familyNo}
            onChangeText={setFamilyNo}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.gnDivision', 'GN Division')}</Text>
          <View style={styles.gnRow}>
            {GN_DIVISIONS.map((gn) => (
              <TouchableOpacity
                key={gn}
                activeOpacity={0.7}
                style={[styles.gnChip, gnDivision === gn && styles.gnChipActive]}
                onPress={() => setGnDivision(gn)}
              >
                <Text style={[styles.gnText, gnDivision === gn && styles.gnTextActive]}>{gn}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.address', 'Residential Address')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Address details"
            placeholderTextColor={COLORS.textTertiary}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.husbandName', "Husband's Name")}</Text>
          <TextInput
            style={styles.input}
            placeholder="Husband full name"
            placeholderTextColor={COLORS.textTertiary}
            value={husbandName}
            onChangeText={setHusbandName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.emergencyPhone', 'Emergency Phone')}</Text>
          <TextInput
            style={styles.input}
            placeholder="07XXXXXXXX"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="phone-pad"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
          />
        </View>
      </View>

      {/* 2. MOTHER BIOGRAPHIC DETAILS */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.sectionTitle}>Mother Personal Details</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.fullName', 'Full Name')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="Mother full name"
            placeholderTextColor={COLORS.textTertiary}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.nic', 'NIC Number')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 199512345678 or 951234567V"
            placeholderTextColor={COLORS.textTertiary}
            value={nic}
            onChangeText={setNic}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.dob', 'Date of Birth (YYYY-MM-DD)')}</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textTertiary}
            value={dob}
            onChangeText={setDob}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.phone', 'Phone Number')}</Text>
          <TextInput
            style={styles.input}
            placeholder="07XXXXXXXX"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mother.bloodGroup', 'Blood Group')}</Text>
          <View style={styles.bgGrid}>
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity
                key={bg}
                activeOpacity={0.7}
                style={[styles.bgChip, bloodGroup === bg && styles.bgChipActive]}
                onPress={() => setBloodGroup(bg)}
              >
                <Text style={[styles.bgText, bloodGroup === bg && styles.bgTextActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 3. MEDICAL & OBSTETRIC RISK FACTORS */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.sectionTitle}>Clinical History & Risk Tiers</Text>
        </View>

        <Text style={styles.label}>{t('mother.chronicConditions', 'Chronic Conditions')}</Text>
        <TapChipSelector
          options={CHRONIC_OPTIONS}
          selectedValues={chronicConditions}
          onChange={setChronicConditions}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Fertility Treatment Pregnancy?</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toggleBtn, isFertilityTreatment && styles.toggleBtnActive]}
            onPress={() => setIsFertilityTreatment(!isFertilityTreatment)}
          >
            <Text style={[styles.toggleBtnText, isFertilityTreatment && styles.toggleTextActive]}>
              {isFertilityTreatment ? 'YES (High Risk)' : 'NO'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Pre-Conception Planning?</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toggleBtn, isPlanningPregnancy && styles.toggleBtnActiveTeal]}
            onPress={() => setIsPlanningPregnancy(!isPlanningPregnancy)}
          >
            <Text style={[styles.toggleBtnText, isPlanningPregnancy && styles.toggleTextActive]}>
              {isPlanningPregnancy ? 'YES' : 'NO'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Steppers for Obstetric History */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperItem}>
            <Text style={styles.stepperLabel}>PREV MISCARRIAGES</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevMiscarriages(Math.max(0, prevMiscarriages - 1))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{prevMiscarriages}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevMiscarriages(prevMiscarriages + 1)}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperItem}>
            <Text style={styles.stepperLabel}>PREV STILLBIRTHS</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevStillbirths(Math.max(0, prevStillbirths - 1))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{prevStillbirths}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevStillbirths(prevStillbirths + 1)}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperItem}>
            <Text style={styles.stepperLabel}>PREV C-SECTIONS</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevCSections(Math.max(0, prevCSections - 1))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{prevCSections}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevCSections(prevCSections + 1)}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 4. CURRENT PREGNANCY DETAILS */}
      <View style={styles.sectionCard}>
        <View style={styles.pregToggleHeader}>
          <View style={styles.cardHeaderGroup}>
            <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.sectionTitle}>Current Pregnancy Record</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toggleBtn, isPregnant && styles.toggleBtnActiveTeal]}
            onPress={() => setIsPregnant(!isPregnant)}
          >
            <Text style={[styles.toggleBtnText, isPregnant && styles.toggleTextActive]}>
              {isPregnant ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </TouchableOpacity>
        </View>

        {isPregnant && (
          <View style={{ marginTop: 10 }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>LRMP Date (Last Menstrual Period) *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textTertiary}
                value={lrmpDate}
                onChangeText={setLrmpDate}
              />
            </View>

            <View style={styles.gravidaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gravida (Total)</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.stepBtn}
                    onPress={() => setGravida(Math.max(1, gravida - 1))}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{gravida}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.stepBtn}
                    onPress={() => setGravida(gravida + 1)}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Para (Past Births)</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.stepBtn}
                    onPress={() => setPara(Math.max(0, para - 1))}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{para}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.stepBtn}
                    onPress={() => setPara(para + 1)}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 5. SUBMIT ACTION */}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isSubmitting}
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleRegister}
      >
        <Text style={styles.submitBtnText}>
          {isSubmitting ? 'Registering...' : `✓ ${t('mother.save', 'Complete Registration')}`}
        </Text>
      </TouchableOpacity>
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
  sectionCard: {
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
  sectionTitle: {
    ...TYPOGRAPHY.h3,
  },
  formGroup: {
    marginBottom: 12,
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
  gnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gnChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceSubtle,
  },
  gnChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  gnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  gnTextActive: {
    color: COLORS.textWhite,
  },
  bgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bgChip: {
    width: '22%',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
  },
  bgChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bgText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  bgTextActive: {
    color: COLORS.textWhite,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.risk.red.accent,
    borderColor: COLORS.risk.red.accent,
  },
  toggleBtnActiveTeal: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.textWhite,
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stepperItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  stepperLabel: {
    ...TYPOGRAPHY.overline,
    fontSize: 9,
    color: COLORS.textTertiary,
    marginBottom: 6,
    textAlign: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  stepVal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  pregToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gravidaRow: {
    flexDirection: 'row',
    gap: 12,
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
