import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pregnancy } from '@/src/db/motherRepo';
import { PostnatalMeows, updateHospitalDeliveryNotes } from '@/src/db';
import { MeowsChart } from '@/src/components/charts';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

interface MotherPostnatalTabProps {
  pregnancy: Pregnancy | null;
  meowsLogs: PostnatalMeows[];
  onRefreshLogs: () => void;
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

export const MotherPostnatalTab: React.FC<MotherPostnatalTabProps> = ({
  pregnancy,
  meowsLogs,
  onRefreshLogs,
}) => {
  const { t } = useTranslation();
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [deliveryModeInput, setDeliveryModeInput] = useState('');
  const [partographInput, setPartographInput] = useState('');
  const [ctgInput, setCtgInput] = useState('');
  const [apgarInput, setApgarInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const deliveryNotes = safeParseJson<Record<string, any>>(
    pregnancy?.hospital_delivery_notes_json,
    {}
  );

  const handleOpenEditNotes = () => {
    setDeliveryModeInput(deliveryNotes.delivery_mode || pregnancy?.delivery_mode || '');
    setPartographInput(deliveryNotes.partograph_summary || '');
    setCtgInput(deliveryNotes.ctg_summary || '');
    setApgarInput(deliveryNotes.apgar_5m ? String(deliveryNotes.apgar_5m) : '10');
    setShowNotesModal(true);
  };

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
      onRefreshLogs();
    } catch (e: any) {
      console.warn('Error saving delivery notes:', e);
      Alert.alert(t('common.error', 'Error'), 'Failed to save delivery notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <>
      {/* Postnatal MEOWS Chart */}
      <MeowsChart
        pregnancyId={pregnancy?.id || ''}
        meowsLogs={meowsLogs}
        onRefreshLogs={onRefreshLogs}
      />

      {/* Hospital Delivery & Partograph / CTG Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderGroup}>
            <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.cardTitle}>Delivery & Partograph Summary</Text>
          </View>
          <TouchableOpacity
            style={styles.editNotesBtn}
            onPress={handleOpenEditNotes}
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

              <Text style={styles.modalFieldLabel}>Apgar Score (5 minutes)</Text>
              <TextInput
                style={styles.modalInput}
                value={apgarInput}
                onChangeText={setApgarInput}
                keyboardType="numeric"
                placeholder="e.g. 10"
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.modalFieldLabel}>Partograph & Cervical Dilatation Summary</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={partographInput}
                onChangeText={setPartographInput}
                multiline
                numberOfLines={3}
                placeholder="Record active phase dilatation, alert line status, liquor color..."
                placeholderTextColor={COLORS.textTertiary}
              />

              <Text style={styles.modalFieldLabel}>CTG & Fetal Heart Tracing Summary</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={ctgInput}
                onChangeText={setCtgInput}
                multiline
                numberOfLines={3}
                placeholder="Record baseline FHR, variability, accelerations, decelerations..."
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
    </>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  editNotesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  editNotesBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  deliveryDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    marginBottom: 12,
  },
  deliveryItem: {
    flex: 1,
    alignItems: 'center',
  },
  deliveryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  deliveryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderHairline,
  },
  notesSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  notesSectionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  notesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  notesModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '85%',
  },
  notesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesModalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  notesModalClose: {
    fontSize: 20,
    color: COLORS.textTertiary,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  modalTextArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  saveNotesBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveNotesBtnText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});
