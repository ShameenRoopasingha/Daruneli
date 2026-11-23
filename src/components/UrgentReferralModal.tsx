import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS, SHADOWS } from '../theme';

interface UrgentReferralModalProps {
  visible: boolean;
  reasons: string[];
  motherName?: string;
  phone?: string;
  onDismiss: () => void;
  onAcknowledge: () => void;
}

export const UrgentReferralModal: React.FC<UrgentReferralModalProps> = ({
  visible,
  reasons,
  motherName,
  phone,
  onDismiss,
  onAcknowledge,
}) => {
  const { t } = useTranslation();

  const handleCallEmergency = () => {
    Linking.openURL('tel:1990').catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate call to 1990 Suwa Seriya');
    });
  };

  const handleCallMother = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Call Failed', `Unable to call ${phone}`);
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🚨</Text>
            </View>
            <Text style={styles.title}>
              {t('mother.urgentReferral', 'URGENT VOG REFERRAL REQUIRED')}
            </Text>
            <Text style={styles.message}>
              {t(
                'mother.urgentReferralMsg',
                'Clinical danger signs or severe hypertension detected. Immediate hospital referral required.'
              )}
            </Text>
          </View>

          {motherName ? (
            <View style={styles.targetCard}>
              <Text style={styles.targetLabel}>Patient:</Text>
              <Text style={styles.targetName}>{motherName}</Text>
            </View>
          ) : null}

          {/* Trigger list */}
          <View style={styles.triggerList}>
            <Text style={styles.triggerHeader}>CRITICAL CLINICAL TRIGGERS</Text>
            {reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Text style={styles.reasonBullet}>•</Text>
                <Text style={styles.reasonText}>{r}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.ambulanceBtn]}
              onPress={handleCallEmergency}
            >
              <Text style={styles.ambulanceBtnText}>🚑 Call 1990 (Suwa Seriya Ambulance)</Text>
            </TouchableOpacity>

            {phone ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.btn, styles.callBtn]}
                onPress={handleCallMother}
              >
                <Text style={styles.callBtnText}>📞 Call Mother ({phone})</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, styles.ackBtn]}
              onPress={onAcknowledge}
            >
              <Text style={styles.ackBtnText}>
                {t('mother.referralAcknowledged', 'Record Referral & Continue')}
              </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    ...SHADOWS.modal,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.risk.red.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.risk.red.accent,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  targetCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.risk.red.bg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 6,
  },
  targetLabel: {
    fontSize: 12,
    color: COLORS.risk.red.text,
    fontWeight: '600',
  },
  targetName: {
    fontSize: 13,
    color: COLORS.risk.red.text,
    fontWeight: '800',
  },
  triggerList: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  triggerHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.risk.red.accent,
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  reasonRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  reasonBullet: {
    fontSize: 13,
    color: COLORS.risk.red.accent,
    marginRight: 6,
    fontWeight: 'bold',
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.risk.red.text,
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    gap: 8,
  },
  btn: {
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  ambulanceBtn: {
    backgroundColor: COLORS.risk.red.accent,
  },
  ambulanceBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  callBtn: {
    backgroundColor: COLORS.accentPhoneLight,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  callBtnText: {
    color: COLORS.accentPhone,
    fontWeight: '700',
    fontSize: 13,
  },
  ackBtn: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  ackBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
});
