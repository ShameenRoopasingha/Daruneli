import React from 'react';
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
import { COLORS, SHADOWS } from '../theme';
import type { AutoBalanceProposal } from '../engine/scheduleEngine';

interface AutoBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (proposal: AutoBalanceProposal) => Promise<void>;
  proposal: AutoBalanceProposal | null;
  dailyCap: number;
  currentTotal: number;
}

export const AutoBalanceModal: React.FC<AutoBalanceModalProps> = ({
  visible,
  onClose,
  onApply,
  proposal,
  dailyCap,
  currentTotal,
}) => {
  const { i18n } = useTranslation();
  const isSi = i18n.language === 'si';
  const [loading, setLoading] = React.useState(false);

  if (!visible || !proposal) return null;

  const handleConfirm = () => {
    Alert.alert(
      isSi ? 'ස්වයංක්‍රීය තුලනය ක්‍රියාත්මක කරන්නද?' : 'Apply Auto-Balance Plan?',
      isSi
        ? `චාරිකා ${proposal.moves.length} ක් යෝජිත සායන / චාරිකා දිනයන්ට මාරු කිරීම ස්ථිර කරන්නද?`
        : `Are you sure you want to move ${proposal.moves.length} routine home visits to the proposed balanced dates?`,
      [
        { text: isSi ? 'අවලංගු කරන්න' : 'Cancel', style: 'cancel' },
        {
          text: isSi ? 'තහවුරු කරන්න' : 'Confirm Moves',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await onApply(proposal);
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to apply auto-balance plan.');
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
            <View style={styles.headerTitleBox}>
              <Text style={styles.title}>
                ⚡ {isSi ? 'වැඩ බර ස්වයංක්‍රීයව තුලනය කිරීම' : 'Smart Auto-Balance'}
              </Text>
              <Text style={styles.sub}>
                {isSi
                  ? `දෛනික සීමාව: ${dailyCap} | වත්මන් චාරිකා: ${currentTotal} | මාරු කිරීමට නියමිත: ${proposal.moves.length}`
                  : `Daily Cap: ${dailyCap} | Scheduled: ${currentTotal} | Proposed to Move: ${proposal.moves.length}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Locked Items Protection Notice */}
            <View style={styles.lockedNotice}>
              <Text style={styles.lockedNoticeIcon}>🔒</Text>
              <View style={styles.lockedNoticeTextContainer}>
                <Text style={styles.lockedNoticeTitle}>
                  {isSi
                    ? `ඉහළ අවදානම් / හදිසි සංචාර ${proposal.lockedCount} ක් ආරක්‍ෂිතයි`
                    : `${proposal.lockedCount} High-Risk & Urgent Visits Protected`}
                </Text>
                <Text style={styles.lockedNoticeSub}>
                  {isSi
                    ? 'රතු අවදානම් සහ හදිසි චාරිකා මෙම දිනයේදීම තබා ගැනේ. වෙනත් දිනවලට මාරු කරනු ලබන්නේ අඩු අවදානම් චාරිකා පමණි.'
                    : 'RED-risk and urgent visits stay pinned on this date. Only routine, normal-risk visits are rescheduled.'}
                </Text>
              </View>
            </View>

            {/* Proposed Moves */}
            <Text style={styles.sectionHeading}>
              {isSi ? 'යෝජිත චාරිකා මාරු කිරීම්' : 'Proposed Rebalancing Moves'}
            </Text>

            {proposal.moves.map((move, index) => (
              <View key={move.itemId || index} style={styles.moveCard}>
                <View style={styles.moveLeft}>
                  <Text style={styles.moveIcon}>
                    {move.targetType === 'CHILD' ? '👶' : '🤰'}
                  </Text>
                  <View style={styles.moveInfo}>
                    <Text style={styles.moveName}>{move.name}</Text>
                    <Text style={styles.moveGn}>📍 {move.gnDivision}</Text>
                  </View>
                </View>

                <View style={styles.moveToContainer}>
                  <Text style={styles.arrowIcon}>➔</Text>
                  <View style={styles.targetDayPill}>
                    <Text style={styles.targetDayText}>{move.toDayLabel}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Actions */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>{isSi ? 'අවලංගු කරන්න' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm} disabled={loading}>
                <Text style={styles.applyBtnText}>
                  {loading
                    ? isSi ? 'සුරකිමින්...' : 'Applying...'
                    : isSi ? 'තුලනය ක්‍රියාත්මක කරන්න' : 'Apply Rebalance'}
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
  headerTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 17,
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
  lockedNotice: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  lockedNoticeIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  lockedNoticeTextContainer: {
    flex: 1,
  },
  lockedNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  lockedNoticeSub: {
    fontSize: 11.5,
    color: '#047857',
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  moveCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  moveIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  moveInfo: {
    flex: 1,
  },
  moveName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  moveGn: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  moveToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowIcon: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  targetDayPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  targetDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDeep,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
    ...SHADOWS.card,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
