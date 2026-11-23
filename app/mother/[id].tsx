import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  useWindowDimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getMotherById,
  getMotherByQR,
  getActivePregnancy,
  getVisitsForPregnancy,
  getKickLogsForPregnancy,
  getMeowsLogsForPregnancy,
  updateHospitalDeliveryNotes,
  type MotherWithPregnancy,
  type Pregnancy,
  type AntenatalVisit,
  type FetalKickLog,
  type PostnatalMeows,
} from '@/src/db';
import { RiskBadge } from '@/src/components/RiskBadge';
import { SvgLineChart, type DataPoint } from '@/src/components/SvgLineChart';
import { DeliveryModal } from '@/src/components/DeliveryModal';
import {
  SfhChart,
  MaternalWeightBmiChart,
  CardiffKickChart,
  MeowsChart,
  GestationalWheelTool,
} from '@/src/components/charts';
import { calculatePOA, formatPOA, formatEDD } from '@/src/engine/pregnancyCalc';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme/tokens';

function formatDisplayDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function getAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function MotherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

  type SubNavTab = 'OVERVIEW' | 'ANTENATAL_CHARTS' | 'KICK_CHART' | 'POSTNATAL_MEOWS';
  const [activeTab, setActiveTab] = useState<SubNavTab>('OVERVIEW');
  const [mother, setMother] = useState<MotherWithPregnancy | null>(null);
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [visits, setVisits] = useState<AntenatalVisit[]>([]);
  const [kickLogs, setKickLogs] = useState<FetalKickLog[]>([]);
  const [meowsLogs, setMeowsLogs] = useState<PostnatalMeows[]>([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Delivery Notes Form states
  const [deliveryModeInput, setDeliveryModeInput] = useState('');
  const [partographInput, setPartographInput] = useState('');
  const [ctgInput, setCtgInput] = useState('');
  const [apgarInput, setApgarInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      let m = await getMotherById(id);
      // Fallback: If id is a QR token
      if (!m) {
        m = (await getMotherByQR(id)) as MotherWithPregnancy | null;
      }
      setMother(m);
      if (m) {
        const p = await getActivePregnancy(m.id);
        setPregnancy(p);
        if (p) {
          const [vList, kList, mList] = await Promise.all([
            getVisitsForPregnancy(p.id),
            getKickLogsForPregnancy(p.id),
            getMeowsLogsForPregnancy(p.id),
          ]);
          setVisits(vList);
          setKickLogs(kList);
          setMeowsLogs(mList);
        }
      }
    } catch (e) {
      console.error('Failed to load mother profile:', e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCall = () => {
    if (mother?.phone) {
      Linking.openURL(`tel:${mother.phone}`).catch(() => {
        Alert.alert('Call Failed', 'Unable to initiate phone call');
      });
    } else {
      Alert.alert('No Phone Number', 'No phone number recorded for this mother');
    }
  };

  const handleWhatsApp = () => {
    if (mother?.phone) {
      const cleanPhone = mother.phone.replace(/^0/, '+94');
      const isSinhala = i18n.language === 'si';
      const msg = isSinhala
        ? `ආයුබෝවන් ${mother.full_name}, මම ඔබගේ PHM මහත්මියයි. ඔබගේ මීළඟ සායනික පරීක්ෂාව පිළිබඳ මතක් කිරීමකි.`
        : `Ayubowan ${mother.full_name}, this is your Public Health Midwife (PHM). Reminder for your upcoming antenatal checkup.`;

      const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
      Linking.openURL(url).catch(() => {
        Linking.openURL(`sms:${mother.phone}?body=${encodeURIComponent(msg)}`);
      });
    } else {
      Alert.alert('No Phone Number', 'No phone number recorded for this mother');
    }
  };

  if (!mother) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading Mother Profile...')}</Text>
      </View>
    );
  }

  // Calculate Gestational POA & Progress
  const lrmp = pregnancy?.lrmp_date ? new Date(pregnancy.lrmp_date) : null;
  const poa = lrmp ? calculatePOA(lrmp) : null;

  // Safe JSON extraction
  const riskReasons: string[] = safeParseJson<string[]>(
    pregnancy?.risk_factors_json || mother.preg_risk_factors || mother.risk_factors_json,
    []
  );

  const chronicConditions: string[] = safeParseJson<string[]>(
    mother.chronic_conditions_json,
    []
  );

  // Age calculation
  const age = getAge(mother.dob);

  // Parse delivery notes
  const deliveryNotes = safeParseJson<Record<string, any>>(
    pregnancy?.hospital_delivery_notes_json,
    {}
  );

  const handleSaveDeliveryNotes = async () => {
    if (!pregnancy) return;
    setIsSavingNotes(true);
    try {
      const updatedNotes = {
        ...deliveryNotes,
        delivery_mode: deliveryModeInput || deliveryNotes.delivery_mode || 'Spontaneous Vaginal',
        apgar_5m: parseInt(apgarInput, 10) || deliveryNotes.apgar_5m || 10,
        partograph_summary: partographInput,
        ctg_summary: ctgInput,
      };
      await updateHospitalDeliveryNotes(pregnancy.id, updatedNotes);
      setShowNotesModal(false);
      loadData();
    } catch (e: any) {
      console.warn('Error saving delivery notes:', e);
      Alert.alert(
        t('common.error', 'දෝෂයකි'),
        (t('mother.deliverySaveFailed', 'ප්‍රසූති සටහන් සුරැකීම අසාර්ථක විය') + ': ' + (e?.message || ''))
      );
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Risk styling tokens
  const riskLevel = pregnancy?.risk_level || 'GREEN';
  const riskTokens =
    riskLevel === 'RED'
      ? COLORS.risk.red
      : riskLevel === 'YELLOW'
      ? COLORS.risk.yellow
      : COLORS.risk.green;

  const followUpDays = riskLevel === 'RED' ? 7 : riskLevel === 'YELLOW' ? 14 : 28;

  // Prepare chart data (chronological order)
  const sortedVisits = [...visits].reverse();
  const bpData: DataPoint[] = sortedVisits
    .filter((v) => v.bp_systolic !== null && v.bp_diastolic !== null)
    .map((v) => ({
      label: v.poa_weeks ? `${v.poa_weeks}w` : v.visit_date.slice(5),
      value: v.bp_systolic || 0,
      secondaryValue: v.bp_diastolic || 0,
    }));

  // Chart width calculation (constrained within card padding: screen - 32px screen padding - 32px card padding)
  const chartWidth = Math.max(windowWidth - 64, 280);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. IDENTITY HEADER CARD (Vertical flex-col) */}
      <View style={styles.identityCard}>
        {/* Top Badges Row with flex-wrap so Sinhala badges wrap cleanly */}
        <View style={styles.badgesRow}>
          <RiskBadge
            level={riskLevel}
            score={pregnancy?.risk_score}
            size="md"
          />

          {/* Follow-up SLA Pill */}
          <View
            style={[
              styles.followUpPill,
              { backgroundColor: riskTokens.bg, borderColor: riskTokens.border },
            ]}
          >
            <Text style={[styles.followUpPillText, { color: riskTokens.text }]}>
              ⏱ {t('risk.followUp', { days: followUpDays, defaultValue: `Review in ${followUpDays}d` })}
            </Text>
          </View>

          {/* Sync Status Pill */}
          <View
            style={[
              styles.syncPill,
              mother.is_dirty ? styles.syncPillPending : styles.syncPillSynced,
            ]}
          >
            <Text
              style={[
                styles.syncPillText,
                mother.is_dirty ? styles.syncTextPending : styles.syncTextSynced,
              ]}
            >
              {mother.is_dirty
                ? `⏳ ${t('sync.pending', 'Pending Sync')}`
                : `✓ ${t('sync.synced', 'Synced')}`}
            </Text>
          </View>
        </View>

        {/* Mother Full Name */}
        <Text style={styles.motherName}>{mother.full_name}</Text>

        {/* Age & Blood Group Subtitle */}
        <Text style={styles.motherSubtitle}>
          {age !== null ? `${t('mother.age', 'Age')} ${age} yrs • ` : ''}
          {mother.blood_group ? `${t('mother.bloodGroup', 'Blood')}: ${mother.blood_group}` : 'Blood: Unknown'}
          {mother.planning_pregnancy === 1 ? ` • ${t('mother.preConception', 'Pre-Conception')}` : ''}
        </Text>

        {/* Information Meta Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('mother.nic', 'NIC NUMBER')}</Text>
            <Text style={styles.metaValue}>{mother.nic || 'N/A'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('mother.familyNo', 'FAMILY NO')}</Text>
            <Text style={styles.metaValue}>{mother.eligible_family_no || 'N/A'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('mother.gnDivision', 'GN DIVISION')}</Text>
            <Text style={styles.metaValue}>{mother.gn_division || 'General'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('mother.husbandName', 'HUSBAND')}</Text>
            <Text style={styles.metaValue}>{mother.husband_name || 'N/A'}</Text>
          </View>
        </View>

        {/* Address & Emergency Phone */}
        {mother.address ? (
          <View style={styles.addressRow}>
            <Text style={styles.addressText}>📍 {mother.address}</Text>
          </View>
        ) : null}

        {mother.emergency_phone ? (
          <View style={styles.emergencyRow}>
            <Text style={styles.emergencyText}>🚨 Emergency: {mother.emergency_phone}</Text>
          </View>
        ) : null}
      </View>

      {/* SUB-NAV TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subnavContainer}
      >
        <TouchableOpacity
          style={[styles.subnavPill, activeTab === 'OVERVIEW' && styles.subnavPillActive]}
          onPress={() => setActiveTab('OVERVIEW')}
        >
          <Text style={[styles.subnavText, activeTab === 'OVERVIEW' && styles.subnavTextActive]}>
            {t('mother.tabOverview', 'Overview')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subnavPill, activeTab === 'ANTENATAL_CHARTS' && styles.subnavPillActive]}
          onPress={() => setActiveTab('ANTENATAL_CHARTS')}
        >
          <Text style={[styles.subnavText, activeTab === 'ANTENATAL_CHARTS' && styles.subnavTextActive]}>
            📈 {t('mother.tabAntenatalCharts', 'Antenatal Charts')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subnavPill, activeTab === 'KICK_CHART' && styles.subnavPillActive]}
          onPress={() => setActiveTab('KICK_CHART')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.subnavText, activeTab === 'KICK_CHART' && styles.subnavTextActive]}>
              🦶 {t('mother.tabKickChart', 'Kick Chart')}
            </Text>
            {poa && poa.poaWeeks >= 28 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>28w+</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subnavPill, activeTab === 'POSTNATAL_MEOWS' && styles.subnavPillActive]}
          onPress={() => setActiveTab('POSTNATAL_MEOWS')}
        >
          <Text style={[styles.subnavText, activeTab === 'POSTNATAL_MEOWS' && styles.subnavTextActive]}>
            🩺 {t('mother.tabPostnatalMeows', 'Postnatal & MEOWS')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {activeTab === 'OVERVIEW' && (
        <>
          {/* 2. QUICK ACTION BAR (2-Column Grid) */}
      <View style={styles.quickActionCard}>
        <Text style={styles.sectionHeaderTitle}>{t('mother.quickActions', 'Quick Actions')}</Text>
        <View style={styles.actionGrid}>
          {/* Call Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionBtn, styles.callBtn]}
            onPress={handleCall}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.callBtnText}>{t('dashboard.call', 'Call')}</Text>
            <Text style={styles.actionSubtext}>{mother.phone || 'No phone'}</Text>
          </TouchableOpacity>

          {/* WhatsApp Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionBtn, styles.whatsappBtn]}
            onPress={handleWhatsApp}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.whatsappBtnText}>{t('dashboard.whatsapp', 'WhatsApp')}</Text>
            <Text style={styles.actionSubtext}>{t('mother.reminder', 'Send Reminder')}</Text>
          </TouchableOpacity>

          {/* Log Antenatal Visit */}
          {pregnancy && pregnancy.status === 'ACTIVE' && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.logVisitBtn]}
              onPress={() => router.push(`/mother/visit/${pregnancy.id}` as any)}
            >
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.logVisitBtnText}>{t('mother.newVisit', 'Log Visit')}</Text>
              <Text style={styles.actionSubtext}>{t('mother.clinicalCheck', 'Antenatal Check')}</Text>
            </TouchableOpacity>
          )}

          {/* Mark as Delivered */}
          {pregnancy && pregnancy.status === 'ACTIVE' && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.deliverBtn]}
              onPress={() => setShowDeliveryModal(true)}
            >
              <Text style={styles.actionIcon}>👶</Text>
              <Text style={styles.deliverBtnText}>{t('mother.markDelivered', 'Birth / Deliver')}</Text>
              <Text style={styles.actionSubtext}>{t('mother.registerNewborn', 'Register Baby')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. PREGNANCY PROGRESS CARD (For Active Pregnancies) */}
      {poa && pregnancy && pregnancy.status === 'ACTIVE' && (
        <View style={styles.card}>
          <View style={styles.cardHeaderGroup}>
            <View style={[styles.bulletDot, { backgroundColor: riskTokens.dot }]} />
            <Text style={styles.cardTitle}>
              {t('mother.gestationalProgress', 'Gestational Progress & EDD')}
            </Text>
          </View>

          <View style={styles.poaRow}>
            <View>
              <Text style={styles.cardLabel}>{t('mother.poa', 'Period of Amenorrhea (POA)')}</Text>
              <Text style={styles.poaText}>{formatPOA(poa)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardLabel}>{t('mother.edd', 'Expected Delivery (EDD)')}</Text>
              <Text style={styles.eddText}>{formatEDD(poa.edd)}</Text>
            </View>
          </View>

          {/* Progress Bar (1-40 Weeks) */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(Math.max(poa.progressPercent, 4), 100)}%`,
                  backgroundColor: riskTokens.dot,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressSub}>Week 1</Text>
            <View style={styles.trimesterPill}>
              <Text style={styles.trimesterText}>
                Trimester {poa.trimester}
              </Text>
            </View>
            <Text style={styles.progressSub}>Week 40</Text>
          </View>
        </View>
      )}

      {/* 4. CLINICAL RISK REASONS & OBSTETRIC HISTORY CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeaderGroup}>
          <View style={[styles.bulletDot, { backgroundColor: riskTokens.dot }]} />
          <Text style={styles.cardTitle}>
            {t('mother.riskReasons', 'Risk Assessment & Obstetric History')}
          </Text>
        </View>

        {/* Explicit Bullet List of Triggered Risk Reasons */}
        {riskReasons.length > 0 ? (
          <View
            style={[
              styles.reasonsBox,
              { backgroundColor: riskTokens.bg, borderColor: riskTokens.border },
            ]}
          >
            <Text style={[styles.reasonsBoxTitle, { color: riskTokens.text }]}>
              ⚠️ {t('mother.triggeredRisks', 'Identified High-Risk & Miscarriage Factors:')}
            </Text>
            {riskReasons.map((reason, idx) => (
              <View key={idx} style={styles.reasonItem}>
                <Text style={[styles.reasonDot, { color: riskTokens.dot }]}>•</Text>
                <Text style={[styles.reasonText, { color: riskTokens.text }]}>{reason}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.normalBox}>
            <Text style={styles.normalText}>
              ✓ {t('mother.lowRiskNotice', 'Low risk pregnancy • Routine antenatal care scheduled')}
            </Text>
          </View>
        )}

        {/* Obstetric History Grid */}
        <View style={styles.obstetricGrid}>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.gravidaPara', 'GRAVIDA / PARA')}</Text>
            <Text style={styles.obsVal}>
              G{pregnancy?.gravida ?? 1} P{pregnancy?.para ?? 0}
            </Text>
          </View>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.prevMiscarriages', 'MISCARRIAGES')}</Text>
            <Text
              style={[
                styles.obsVal,
                mother.prev_miscarriages_count > 0 && styles.obsValAlert,
              ]}
            >
              {mother.prev_miscarriages_count}
            </Text>
          </View>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.prevStillbirths', 'STILLBIRTHS')}</Text>
            <Text
              style={[
                styles.obsVal,
                mother.prev_stillbirths_count > 0 && styles.obsValAlert,
              ]}
            >
              {mother.prev_stillbirths_count}
            </Text>
          </View>
          <View style={styles.obsItem}>
            <Text style={styles.obsLabel}>{t('mother.prevCSections', 'C-SECTIONS')}</Text>
            <Text style={styles.obsVal}>{mother.prev_c_sections_count}</Text>
          </View>
        </View>

        {/* Fertility Treatment Alert */}
        {mother.fertility_treatment_history === 1 && (
          <View style={styles.preciousNotice}>
            <Text style={styles.preciousNoticeText}>
              ✨ {t('mother.fertilityTreatment', 'Precious Pregnancy: History of Fertility Treatment / Subfertility Management')}
            </Text>
          </View>
        )}

        {/* Chronic Conditions */}
        {chronicConditions.length > 0 && (
          <View style={styles.chronicContainer}>
            <Text style={styles.chronicLabel}>
              {t('mother.chronicConditions', 'Chronic Medical Conditions')}:
            </Text>
            <View style={styles.chronicChipsRow}>
              {chronicConditions.map((cond, idx) => (
                <View key={idx} style={styles.chronicChip}>
                  <Text style={styles.chronicChipText}>{cond}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 6. ANTENATAL VISIT HISTORY LIST */}
      <View style={styles.card}>
        <View style={styles.visitHeaderRow}>
          <View style={styles.cardHeaderGroup}>
            <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.cardTitle}>
              {t('mother.visitHistory', 'Antenatal Visit History')} ({visits.length})
            </Text>
          </View>
        </View>

        {visits.length === 0 ? (
          <View style={styles.emptyVisitsContainer}>
            <Text style={styles.emptyVisitsIcon}>📋</Text>
            <Text style={styles.emptyVisitsText}>
              {t('mother.noVisits', 'No antenatal visits recorded yet')}
            </Text>
          </View>
        ) : (
          visits.map((v) => {
            const dangerSigns = safeParseJson<string[]>(v.danger_signs_json, []);
            const supplements = safeParseJson<string[]>(v.supplements_json, []);
            const isHighBp = Boolean(
              (v.bp_systolic && v.bp_systolic >= 140) ||
              (v.bp_diastolic && v.bp_diastolic >= 90)
            );
            const isLowHb = Boolean(v.hemoglobin !== null && v.hemoglobin < 11.0);

            return (
              <View key={v.id} style={styles.visitItem}>
                <View style={styles.visitTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.visitDate}>{formatDisplayDate(v.visit_date)}</Text>
                    {v.poa_weeks && (
                      <Text style={styles.visitPoa}>• {v.poa_weeks.toFixed(1)} wks</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.visitBadge,
                      v.visit_type === 'CLINIC' ? styles.clinicBadge : styles.homeBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.visitBadgeText,
                        v.visit_type === 'CLINIC'
                          ? styles.clinicBadgeText
                          : styles.homeBadgeText,
                      ]}
                    >
                      {v.visit_type}
                    </Text>
                  </View>
                </View>

                {/* Vitals metrics row */}
                <View style={styles.visitStatsRow}>
                  <View style={styles.visitMetric}>
                    <Text style={styles.metricLabel}>BP (mmHg)</Text>
                    <Text style={[styles.metricValue, isHighBp ? styles.metricAlert : undefined]}>
                      {v.bp_systolic || '-'}/{v.bp_diastolic || '-'}
                    </Text>
                  </View>
                  <View style={styles.visitMetric}>
                    <Text style={styles.metricLabel}>Weight</Text>
                    <Text style={styles.metricValue}>
                      {v.weight_kg ? `${v.weight_kg} kg` : '-'}
                    </Text>
                  </View>
                  <View style={styles.visitMetric}>
                    <Text style={styles.metricLabel}>Hemoglobin</Text>
                    <Text style={[styles.metricValue, isLowHb ? styles.metricAlert : undefined]}>
                      {v.hemoglobin ? `${v.hemoglobin} g/dL` : '-'}
                    </Text>
                  </View>
                </View>

                {/* Danger signs warning */}
                {dangerSigns.length > 0 && (
                  <View style={styles.dangerAlertBox}>
                    <Text style={styles.dangerAlertText}>
                      ⚠️ Danger Signs: {dangerSigns.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Supplements chips */}
                {supplements.length > 0 && (
                  <View style={styles.supplementsRow}>
                    <Text style={styles.supplementsLabel}>Supplements:</Text>
                    <View style={styles.supplementsList}>
                      {supplements.map((s, idx) => (
                        <View key={idx} style={styles.supplementChip}>
                          <Text style={styles.supplementChipText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Midwife notes */}
                {v.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.visitNotes}>&quot;{v.notes}&quot;</Text>
                  </View>
                ) : null}

                {/* Next Scheduled Visit */}
                {v.next_visit_date && (
                  <View style={styles.nextVisitRow}>
                    <Text style={styles.nextVisitText}>
                      📅 Next checkup due:{' '}
                      <Text style={styles.nextVisitBold}>{formatDisplayDate(v.next_visit_date)}</Text>
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
      </>
      )}

      {/* =========================================================================
          TAB 2: ANTENATAL CHARTS
         ========================================================================= */}
      {activeTab === 'ANTENATAL_CHARTS' && (
        <>
          {/* Quick Launcher: Gestational Wheel Calculator */}
          <View style={styles.wheelLauncherCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wheelLauncherTitle}>Gestational Age Wheel Tool</Text>
              <Text style={styles.wheelLauncherDesc}>
                Interactive circular 40-week gestation wheel with FHB milestones.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.wheelLauncherBtn}
              onPress={() => setShowWheelModal(true)}
            >
              <Text style={styles.wheelLauncherBtnText}>Open Wheel 🎡</Text>
            </TouchableOpacity>
          </View>

          {/* 1. Symphysis-Fundal Height (SFH) Standardized Chart */}
          <SfhChart visits={visits} motherName={mother.full_name} />

          {/* 2. Maternal Weight Gain & BMI Corridor Chart */}
          <MaternalWeightBmiChart
            bookingWeightKg={pregnancy?.booking_weight_kg}
            bookingHeightCm={pregnancy?.booking_height_cm}
            bookingBmi={pregnancy?.booking_bmi}
            visits={visits}
          />

          {/* 3. Blood Pressure Trend Chart */}
          <View style={styles.card}>
            <View style={styles.cardHeaderGroup}>
              <View style={[styles.bulletDot, { backgroundColor: COLORS.risk.red.accent }]} />
              <Text style={styles.cardTitle}>Blood Pressure Trend (mmHg)</Text>
            </View>
            <SvgLineChart
              data={bpData}
              title={t('mother.bpTrend', 'Blood Pressure Tracking')}
              primaryColor={COLORS.risk.red.accent}
              secondaryColor={COLORS.accentBlue}
              primaryLegend="Systolic"
              secondaryLegend="Diastolic"
              referenceLine={{ value: 140, label: 'Cutoff 140', color: COLORS.risk.red.dot }}
              height={180}
              width={chartWidth}
            />
          </View>
        </>
      )}

      {/* =========================================================================
          TAB 3: KICK CHART
         ========================================================================= */}
      {activeTab === 'KICK_CHART' && (
        <CardiffKickChart
          pregnancyId={pregnancy?.id || ''}
          kickLogs={kickLogs}
          onRefreshLogs={loadData}
          poaWeeks={poa?.poaWeeks}
        />
      )}

      {/* =========================================================================
          TAB 4: POSTNATAL & MEOWS
         ========================================================================= */}
      {activeTab === 'POSTNATAL_MEOWS' && (
        <>
          {/* Postnatal MEOWS Chart */}
          <MeowsChart
            pregnancyId={pregnancy?.id || ''}
            meowsLogs={meowsLogs}
            onRefreshLogs={loadData}
          />

          {/* Hospital Delivery & Partograph / CTG Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderGroup}>
                <View style={[styles.bulletDot, { backgroundColor: '#0D9488' }]} />
                <Text style={styles.cardTitle}>Delivery & Partograph Summary</Text>
              </View>
              <TouchableOpacity
                style={styles.editNotesBtn}
                onPress={() => {
                  setDeliveryModeInput(deliveryNotes.delivery_mode || pregnancy?.delivery_mode || '');
                  setPartographInput(deliveryNotes.partograph_summary || '');
                  setCtgInput(deliveryNotes.ctg_summary || '');
                  setApgarInput(deliveryNotes.apgar_5m ? String(deliveryNotes.apgar_5m) : '10');
                  setShowNotesModal(true);
                }}
              >
                <Text style={styles.editNotesBtnText}>✎ Edit Notes</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deliveryDetailsGrid}>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Delivery Mode</Text>
                <Text style={styles.deliveryValue}>
                  {deliveryNotes.delivery_mode || pregnancy?.delivery_mode || 'Spontaneous Vaginal'}
                </Text>
              </View>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Apgar Score (5m)</Text>
                <Text style={styles.deliveryValue}>
                  {deliveryNotes.apgar_5m || '10'} / 10
                </Text>
              </View>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Episiotomy</Text>
                <Text style={styles.deliveryValue}>
                  {deliveryNotes.episiotomy ? 'Yes (Healing Well)' : 'Intact'}
                </Text>
              </View>
            </View>

            {/* Partograph Summary */}
            <View style={styles.notesSection}>
              <Text style={styles.notesSectionTitle}>Partograph & Labor Progression Notes</Text>
              <Text style={styles.notesSectionText}>
                {deliveryNotes.partograph_summary ||
                  'Normal active labor curve. Cervical dilatation progressed smoothly across alert line; clear liquor.'}
              </Text>
            </View>

            {/* CTG Summary */}
            <View style={styles.notesSection}>
              <Text style={styles.notesSectionTitle}>Cardiotocograph (CTG) Tracing Summary</Text>
              <Text style={styles.notesSectionText}>
                {deliveryNotes.ctg_summary ||
                  'Reactive tracing, baseline fetal heart rate 135-145 bpm, good beat-to-beat variability, no decelerations.'}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* DELIVERY MODAL */}
      {pregnancy && (
        <DeliveryModal
          visible={showDeliveryModal}
          pregnancyId={pregnancy.id}
          motherId={mother.id}
          motherName={mother.full_name}
          onClose={() => setShowDeliveryModal(false)}
          onSuccess={(childId) => {
            setShowDeliveryModal(false);
            router.push(`/child/${childId}` as any);
          }}
        />
      )}

      {/* GESTATIONAL WHEEL MODAL */}
      <GestationalWheelTool
        visible={showWheelModal}
        initialLrmp={pregnancy?.lrmp_date}
        isModal={true}
        onClose={() => setShowWheelModal(false)}
      />

      {/* EDIT DELIVERY NOTES MODAL */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotesModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.notesModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.notesModalContent}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.notesModalHeader}>
                <Text style={styles.notesModalTitle}>Edit Delivery & Partograph Notes</Text>
                <TouchableOpacity
                  onPress={() => setShowNotesModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Text style={styles.notesModalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalFieldLabel}>Delivery Mode</Text>
              <TextInput
                style={styles.modalInput}
                value={deliveryModeInput}
                onChangeText={setDeliveryModeInput}
                placeholder="e.g. Spontaneous Vaginal / Caesarean"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.modalFieldLabel}>Apgar Score at 5 Minutes</Text>
              <TextInput
                style={styles.modalInput}
                value={apgarInput}
                onChangeText={setApgarInput}
                keyboardType="numeric"
                placeholder="e.g. 10"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.modalFieldLabel}>Partograph & Labor Progression Summary</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={partographInput}
                onChangeText={setPartographInput}
                multiline
                numberOfLines={3}
                placeholder="Details of cervical dilatation, membranes, descent..."
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.modalFieldLabel}>CTG Tracing Summary</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={ctgInput}
                onChangeText={setCtgInput}
                multiline
                numberOfLines={3}
                placeholder="Baseline FHR, variability, accelerations, decelerations..."
                placeholderTextColor={COLORS.textTertiary}
              />

              <TouchableOpacity
                style={[styles.saveNotesBtn, isSavingNotes && { opacity: 0.6 }]}
                onPress={handleSaveDeliveryNotes}
                disabled={isSavingNotes}
              >
                <Text style={styles.saveNotesBtnText}>
                  {isSavingNotes ? 'Saving...' : 'Save Hospital Delivery Notes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },

  // 1. Identity Header Card (Vertical flex-col)
  identityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  followUpPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  followUpPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  syncPillSynced: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  syncPillPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  syncPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  syncTextSynced: {
    color: '#065F46',
  },
  syncTextPending: {
    color: '#92400E',
  },
  motherName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  motherSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 3,
    marginBottom: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
  },
  metaItem: {
    width: '48%',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  addressRow: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  emergencyRow: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },

  // 2. Quick Action Bar
  quickActionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 74,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  whatsappBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  whatsappBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  logVisitBtn: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  logVisitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },
  deliverBtn: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  deliverBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },

  // Generic Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // 3. Pregnancy Progress Card
  poaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  poaText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0D9488',
    marginTop: 2,
  },
  eddText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  progressTrack: {
    height: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  trimesterPill: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  trimesterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },

  // 4. Clinical Risk Breakdown & Obstetric History
  reasonsBox: {
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  reasonsBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonDot: {
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 18,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  normalBox: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  normalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  obstetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  obsItem: {
    width: '48%',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 10,
    alignItems: 'center',
  },
  obsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  obsVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  obsValAlert: {
    color: '#DC2626',
  },
  preciousNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    marginBottom: 12,
  },
  preciousNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  chronicContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceSubtle,
  },
  chronicLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chronicChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chronicChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chronicChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },

  // 6. Antenatal Visit History List
  visitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyVisitsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVisitsIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyVisitsText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  visitItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  visitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  visitPoa: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  visitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  visitBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  clinicBadge: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  clinicBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  homeBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  homeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  visitStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  visitMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  metricAlert: {
    color: '#DC2626',
  },
  dangerAlertBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.xs,
    padding: 8,
    marginBottom: 8,
  },
  dangerAlertText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },
  supplementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  supplementsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  supplementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  supplementChip: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  supplementChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xs,
    padding: 8,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  visitNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#334155',
  },
  nextVisitRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nextVisitText: {
    fontSize: 11,
    color: '#475569',
  },
  nextVisitBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  subnavContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  subnavPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subnavPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subnavText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subnavTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wheelLauncherCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  wheelLauncherTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  wheelLauncherDesc: {
    fontSize: 11,
    color: '#4338CA',
    marginTop: 2,
    maxWidth: 210,
  },
  wheelLauncherBtn: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  wheelLauncherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editNotesBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#5EEAD4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editNotesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  deliveryDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  deliveryItem: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  deliveryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  notesSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  notesSectionText: {
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 17,
  },
  notesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  notesModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  notesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  notesModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  notesModalClose: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    padding: 4,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  saveNotesBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveNotesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
