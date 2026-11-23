import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
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
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handlePinGps = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', 'Permission Denied'),
          t('gps.gpsPermissionDenied', 'Location permission is required to pin the home GPS coordinates.')
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGpsLat(loc.coords.latitude);
      setGpsLng(loc.coords.longitude);
      Alert.alert(
        t('common.success', 'Success'),
        t('gps.gpsPinnedSuccess', 'Home GPS coordinates pinned successfully.')
      );
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Could not retrieve GPS coordinates.');
    } finally {
      setIsLocating(false);
    }
  };

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
        gps_lat: gpsLat,
        gps_lng: gpsLng,
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

        {/* GPS Location Pinning */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('gps.pinHomeGps', 'Home GPS Pinning')}</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gpsPinBtn, gpsLat !== null && styles.gpsPinBtnActive]}
            onPress={handlePinGps}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.gpsPinIcon}>{gpsLat !== null ? '📍' : '🧭'}</Text>
                <Text style={[styles.gpsPinText, gpsLat !== null && styles.gpsPinTextActive]}>
                  {gpsLat !== null
                    ? `GPS: ${gpsLat.toFixed(4)}, ${gpsLng?.toFixed(4)} • Tap to Update`
                    : '📍 1-Tap Pin Home GPS Coordinates'}
                </Text>
              </>
            )}
          </TouchableOpacity>
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
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.toggleLabel}>
              {t('mother.fertilityTreatment', 'Fertility Treatment History')}?
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toggleBtn, isFertilityTreatment && styles.toggleBtnActive]}
            onPress={() => setIsFertilityTreatment(!isFertilityTreatment)}
          >
            <Text style={[styles.toggleBtnText, isFertilityTreatment && styles.toggleTextActive]}>
              {isFertilityTreatment ? 'ඔව් (High Risk)' : 'නැත (NO)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.toggleLabel}>
              {t('mother.planningPregnancy', 'Pre-Conception Planning')}?
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.toggleBtn, isPlanningPregnancy && styles.toggleBtnActiveTeal]}
            onPress={() => setIsPlanningPregnancy(!isPlanningPregnancy)}
          >
            <Text style={[styles.toggleBtnText, isPlanningPregnancy && styles.toggleTextActive]}>
              {isPlanningPregnancy ? 'ඔව් (YES)' : 'නැත (NO)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Steppers for Obstetric History */}
        <View style={styles.stepperSection}>
          <Text style={styles.stepperSectionTitle}>
            {t('mother.obstetricHistory', 'ප්‍රසව ඉතිහාසය (Obstetric History)')}
          </Text>

          {/* Previous Miscarriages */}
          <View style={styles.stepperRow}>
            <View style={styles.stepperRowLabelGroup}>
              <Text style={styles.stepperRowLabelSi}>
                {t('mother.prevMiscarriages', 'පෙර ගබ්සාවීම්')}
              </Text>
              <Text style={styles.stepperRowLabelEn}>Previous Miscarriages</Text>
            </View>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.stepBtn, prevMiscarriages === 0 && styles.stepBtnDisabled]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevMiscarriages(Math.max(0, prevMiscarriages - 1))}
                disabled={prevMiscarriages === 0}
                accessibilityLabel="Decrease previous miscarriages"
              >
                <Text style={[styles.stepBtnText, prevMiscarriages === 0 && styles.stepBtnTextDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{prevMiscarriages}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevMiscarriages(prevMiscarriages + 1)}
                accessibilityLabel="Increase previous miscarriages"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Previous Stillbirths */}
          <View style={styles.stepperRow}>
            <View style={styles.stepperRowLabelGroup}>
              <Text style={styles.stepperRowLabelSi}>
                {t('mother.prevStillbirths', 'පෙර මළදරු උපත්')}
              </Text>
              <Text style={styles.stepperRowLabelEn}>Previous Stillbirths</Text>
            </View>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.stepBtn, prevStillbirths === 0 && styles.stepBtnDisabled]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevStillbirths(Math.max(0, prevStillbirths - 1))}
                disabled={prevStillbirths === 0}
                accessibilityLabel="Decrease previous stillbirths"
              >
                <Text style={[styles.stepBtnText, prevStillbirths === 0 && styles.stepBtnTextDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{prevStillbirths}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevStillbirths(prevStillbirths + 1)}
                accessibilityLabel="Increase previous stillbirths"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Previous C-Sections */}
          <View style={styles.stepperRow}>
            <View style={styles.stepperRowLabelGroup}>
              <Text style={styles.stepperRowLabelSi}>
                {t('mother.prevCSections', 'පෙර සිසේරියන් සැත්කම්')}
              </Text>
              <Text style={styles.stepperRowLabelEn}>Previous C-Sections</Text>
            </View>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.stepBtn, prevCSections === 0 && styles.stepBtnDisabled]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevCSections(Math.max(0, prevCSections - 1))}
                disabled={prevCSections === 0}
                accessibilityLabel="Decrease previous c-sections"
              >
                <Text style={[styles.stepBtnText, prevCSections === 0 && styles.stepBtnTextDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{prevCSections}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setPrevCSections(prevCSections + 1)}
                accessibilityLabel="Increase previous c-sections"
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
            <Text style={styles.sectionTitle}>
              {t('mother.activePregnancy', 'Current Pregnancy Record')}
            </Text>
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
              <Text style={styles.label}>
                {t('mother.lrmpDate', 'LRMP Date (Last Menstrual Period)')} *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textTertiary}
                value={lrmpDate}
                onChangeText={setLrmpDate}
              />
            </View>

            <View style={styles.gravidaRow}>
              <View style={styles.gravidaCard}>
                <View style={styles.gravidaLabelGroup}>
                  <Text style={styles.gravidaLabelSi}>ගැබ් වාර (Gravida)</Text>
                  <Text style={styles.gravidaLabelEn}>Total Pregnancies</Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.stepBtn, gravida <= 1 && styles.stepBtnDisabled]}
                    onPress={() => setGravida(Math.max(1, gravida - 1))}
                    disabled={gravida <= 1}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Decrease gravida"
                  >
                    <Text style={[styles.stepBtnText, gravida <= 1 && styles.stepBtnTextDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{gravida}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.stepBtn}
                    onPress={() => setGravida(gravida + 1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Increase gravida"
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.gravidaCard}>
                <View style={styles.gravidaLabelGroup}>
                  <Text style={styles.gravidaLabelSi}>පසුගිය උපත් (Para)</Text>
                  <Text style={styles.gravidaLabelEn}>Past Births</Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.stepBtn, para <= 0 && styles.stepBtnDisabled]}
                    onPress={() => setPara(Math.max(0, para - 1))}
                    disabled={para <= 0}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Decrease para"
                  >
                    <Text style={[styles.stepBtnText, para <= 0 && styles.stepBtnTextDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{para}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.stepBtn}
                    onPress={() => setPara(para + 1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Increase para"
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
    paddingBottom: 64,
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
  gpsPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
  },
  gpsPinBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#CCFBF1',
  },
  gpsPinIcon: {
    fontSize: 16,
  },
  gpsPinText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  gpsPinTextActive: {
    color: COLORS.primaryDeep,
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
    justifyContent: 'center',
    minHeight: 44,
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
  stepperSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderHairline,
  },
  stepperSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
  },
  stepperRowLabelGroup: {
    flex: 1,
    marginRight: 12,
  },
  stepperRowLabelSi: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stepperRowLabelEn: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.borderHairline,
    opacity: 0.45,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  stepBtnTextDisabled: {
    color: COLORS.textTertiary,
  },
  stepVal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 24,
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
    marginTop: 8,
  },
  gravidaCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gravidaLabelGroup: {
    alignItems: 'center',
    marginBottom: 8,
  },
  gravidaLabelSi: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  gravidaLabelEn: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 1,
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
