import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';
import { MotherWithPregnancy, AntenatalVisit, recordMotherTransfer } from '@/src/db/motherRepo';
import { generateAndShareHandoverPdf } from '@/src/reports/handoverPdf';

interface TransferMotherModalProps {
  visible: boolean;
  onClose: () => void;
  mother: MotherWithPregnancy;
  visits: AntenatalVisit[];
  onTransferCompleted: () => void;
}

export const TransferMotherModal: React.FC<TransferMotherModalProps> = ({
  visible,
  onClose,
  mother,
  visits,
  onTransferCompleted,
}) => {
  const { t } = useTranslation();
  const [transferType, setTransferType] = useState<'TEMP_OUT' | 'PERMANENT_TRANSFER'>('TEMP_OUT');
  const [destinationArea, setDestinationArea] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleConfirmTransfer = async () => {
    if (!mother.family_id) {
      Alert.alert(t('common.error', 'Error'), 'No associated family record found for this mother.');
      return;
    }

    if (transferType === 'PERMANENT_TRANSFER' && !destinationArea.trim()) {
      Alert.alert(
        t('common.error', 'Error'),
        'Please enter the destination MOH / PHM area name for a permanent transfer.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert DD/MM/YYYY to YYYY-MM-DD if entered in display format
      let formattedReturnDate: string | undefined = undefined;
      if (expectedReturnDate.trim()) {
        const parts = expectedReturnDate.trim().split('/');
        if (parts.length === 3) {
          formattedReturnDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          formattedReturnDate = expectedReturnDate.trim();
        }
      }

      await recordMotherTransfer({
        family_id: mother.family_id,
        mother_id: mother.id,
        transfer_type: transferType,
        destination_area: destinationArea.trim() || undefined,
        expected_return_date: formattedReturnDate,
        transfer_note: transferNote.trim() || undefined,
        handover_summary: {
          risk_level: mother.risk_level,
          risk_score: mother.risk_score,
          gravida: mother.gravida,
          para: mother.para,
          edd_date: mother.edd_date,
          lrmp_date: mother.lrmp_date,
          latest_weight: visits[0]?.weight_kg,
          latest_bp: visits[0] ? `${visits[0].bp_systolic}/${visits[0].bp_diastolic}` : null,
          transferred_at: new Date().toISOString(),
        },
      });

      Alert.alert(
        t('common.success', 'Success'),
        transferType === 'TEMP_OUT'
          ? `${mother.full_name} has been marked as Temporarily Out (TEMP_OUT). Overdue visit alarms will be paused.`
          : `${mother.full_name} has been permanently transferred out of this PHM area.`
      );

      onTransferCompleted();
      onClose();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Failed to record transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateAndShareHandoverPdf({
        mother,
        visits,
        transferType,
        destinationArea: destinationArea.trim() || undefined,
        expectedReturnDate: expectedReturnDate.trim() || undefined,
        transferNote: transferNote.trim() || undefined,
      });
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Failed to generate handover PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>
                {t('transfers.transferTitle', 'Transfer / Relocation')}
              </Text>
              <Text style={styles.motherName}>{mother.full_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Transfer Type Segmented Buttons */}
            <Text style={styles.fieldLabel}>Transfer Classification *</Text>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.typeOption, transferType === 'TEMP_OUT' && styles.typeOptionActive]}
                onPress={() => setTransferType('TEMP_OUT')}
              >
                <Text
                  style={[
                    styles.typeOptionTitle,
                    transferType === 'TEMP_OUT' && styles.typeOptionTitleActive,
                  ]}
                >
                  🏠 Temporarily Out
                </Text>
                <Text
                  style={[
                    styles.typeOptionSub,
                    transferType === 'TEMP_OUT' && styles.typeOptionSubActive,
                  ]}
                >
                  Moved to maternal home for delivery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.typeOption,
                  transferType === 'PERMANENT_TRANSFER' && styles.typeOptionActive,
                ]}
                onPress={() => setTransferType('PERMANENT_TRANSFER')}
              >
                <Text
                  style={[
                    styles.typeOptionTitle,
                    transferType === 'PERMANENT_TRANSFER' && styles.typeOptionTitleActive,
                  ]}
                >
                  🚚 Permanent Transfer
                </Text>
                <Text
                  style={[
                    styles.typeOptionSub,
                    transferType === 'PERMANENT_TRANSFER' && styles.typeOptionSubActive,
                  ]}
                >
                  Relocated to another PHM area
                </Text>
              </TouchableOpacity>
            </View>

            {/* Destination MOH / PHM Area */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                {t('transfers.destinationArea', 'Destination MOH / PHM Area')}
                {transferType === 'PERMANENT_TRANSFER' ? ' *' : ''}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Galle Fort PHM / MOH Galle"
                placeholderTextColor={COLORS.textTertiary}
                value={destinationArea}
                onChangeText={setDestinationArea}
              />
            </View>

            {/* Expected Return Date (for TEMP_OUT) */}
            {transferType === 'TEMP_OUT' && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>
                  {t('transfers.expectedReturn', 'Expected Return Date')} (DD/MM/YYYY)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={COLORS.textTertiary}
                  value={expectedReturnDate}
                  onChangeText={setExpectedReturnDate}
                />
              </View>
            )}

            {/* Transfer Remarks & Clinical Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                {t('transfers.transferNotes', 'Transfer Notes & Clinical Handover')}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Clinical progress, special care instructions, or receiving contact details..."
                placeholderTextColor={COLORS.textTertiary}
                value={transferNote}
                onChangeText={setTransferNote}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* PDF Handover Export Pill */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.pdfExportBtn}
              onPress={handleGeneratePdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color="#0D9488" />
              ) : (
                <>
                  <Text style={styles.pdfBtnIcon}>📄</Text>
                  <Text style={styles.pdfBtnText}>
                    {t('transfers.handoverSummary', 'Generate Handover Summary PDF')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleConfirmTransfer}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>✓ Confirm Transfer</Text>
              )}
            </TouchableOpacity>
          </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
    ...SHADOWS.floating,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  motherName: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
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
    color: '#64748B',
    fontWeight: '700',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDFA',
  },
  typeOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  typeOptionTitleActive: {
    color: COLORS.primaryDark,
  },
  typeOptionSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  typeOptionSubActive: {
    color: '#0F766E',
  },
  inputGroup: {
    marginBottom: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  pdfExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 6,
  },
  pdfBtnIcon: {
    fontSize: 16,
  },
  pdfBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
