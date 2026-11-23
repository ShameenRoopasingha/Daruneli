import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { RiskBadge } from '../RiskBadge';
import { MotherWithPregnancy, updateFamilyGps, markMotherReturned } from '@/src/db/motherRepo';
import { generateQrMatrix } from '@/src/utils/qrMatrix';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';

interface MotherProfileHeaderProps {
  mother: MotherWithPregnancy;
  onRefresh: () => void;
  onOpenTransferModal: () => void;
  onOpenPortalModal?: () => void;
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

function formatDisplayDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export const MotherProfileHeader: React.FC<MotherProfileHeaderProps> = ({
  mother,
  onRefresh,
  onOpenTransferModal,
  onOpenPortalModal,
}) => {
  const { t } = useTranslation();
  const [isLocating, setIsLocating] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showClinicQrModal, setShowClinicQrModal] = useState(false);

  const qrMatrix = React.useMemo(() => {
    return mother.qr_token ? generateQrMatrix(mother.qr_token) : [];
  }, [mother.qr_token]);

  const motherAge = getAge(mother.dob);
  const isTempOut = mother.residency_status === 'TEMP_OUT';
  const isTransferredOut = mother.residency_status === 'TRANSFERRED_OUT';
  const hasGps = mother.gps_lat !== null && mother.gps_lat !== undefined && mother.gps_lng !== null && mother.gps_lng !== undefined;

  const handleOpenMapsDirections = () => {
    if (!hasGps) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mother.gps_lat},${mother.gps_lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common.error', 'Error'), 'Could not launch Google Maps on this device.');
    });
  };

  const handlePinGps = async () => {
    if (!mother.family_id) {
      Alert.alert(t('common.error', 'Error'), 'No family record found to attach GPS.');
      return;
    }

    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', 'Permission Denied'),
          t('gps.gpsPermissionDenied', 'Location permission is required to pin home GPS.')
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateFamilyGps(mother.family_id, loc.coords.latitude, loc.coords.longitude);
      Alert.alert(
        t('common.success', 'Success'),
        t('gps.gpsPinnedSuccess', 'Home GPS coordinates pinned successfully.')
      );
      onRefresh();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Could not retrieve GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleMarkReturned = () => {
    Alert.alert(
      t('transfers.markReturned', 'Mark Returned (Active)'),
      `Confirm that ${mother.full_name} has returned to the area and should be reactivated in routine field care?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Reactivate'),
          style: 'default',
          onPress: async () => {
            if (!mother.family_id) return;
            try {
              setIsReturning(true);
              await markMotherReturned(mother.id, mother.family_id);
              Alert.alert(
                t('common.success', 'Success'),
                t('transfers.markReturnedSuccess', 'Mother marked as returned and active.')
              );
              onRefresh();
            } catch (err: any) {
              Alert.alert(t('common.error', 'Error'), err?.message || 'Failed to update status.');
            } finally {
              setIsReturning(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.headerCard}>
      {/* Top Status & Risk Badges */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <RiskBadge level={mother.risk_level || 'GREEN'} score={mother.risk_score || 0} />
          {isTempOut && (
            <View style={styles.statusPillAmber}>
              <Text style={styles.statusPillAmberText}>🏠 TEMP_OUT</Text>
            </View>
          )}
          {isTransferredOut && (
            <View style={styles.statusPillSlate}>
              <Text style={styles.statusPillSlateText}>🚚 TRANSFERRED</Text>
            </View>
          )}
        </View>

        {mother.qr_token && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.qrBadge}
            onPress={() => setShowClinicQrModal(true)}
          >
            <Text style={styles.qrBadgeText}>🔍 QR: {mother.qr_token}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Temp Out Alert Banner */}
      {isTempOut && (
        <View style={styles.tempOutBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tempOutTitle}>
              {t('transfers.tempOut', 'Temporarily Out of Area')}
            </Text>
            {mother.temp_out_return_date && (
              <Text style={styles.tempOutSub}>
                Expected Return: <Text style={{ fontWeight: '800' }}>{formatDisplayDate(mother.temp_out_return_date)}</Text>
              </Text>
            )}
            {mother.transfer_note && (
              <Text style={styles.tempOutNote} numberOfLines={2}>
                {mother.transfer_note}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={handleMarkReturned}
            disabled={isReturning}
          >
            {isReturning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.returnBtnText}>✓ Mark Returned</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Transferred Out Banner */}
      {isTransferredOut && (
        <View style={styles.transferredBanner}>
          <Text style={styles.transferredTitle}>
            {t('transfers.transferredOut', 'Permanently Transferred Out')}
          </Text>
          {mother.transferred_to_phm_area && (
            <Text style={styles.transferredSub}>
              Destination: <Text style={{ fontWeight: '800' }}>{mother.transferred_to_phm_area}</Text>
            </Text>
          )}
        </View>
      )}

      {/* Mother Name & Bio */}
      <Text style={styles.name}>{mother.full_name}</Text>
      <Text style={styles.meta}>
        {motherAge !== null ? `${motherAge} yrs` : ''}
        {motherAge !== null && mother.blood_group ? ' • ' : ''}
        {mother.blood_group ? `Blood: ${mother.blood_group}` : ''}
        {mother.nic ? ` • NIC: ${mother.nic}` : ''}
      </Text>

      {/* Family Info & GN Division */}
      <View style={styles.divider} />
      <View style={styles.familyRow}>
        <Text style={styles.familyText}>
          {t('mother.familyNo', 'Eligible Family No')}:{' '}
          <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
            {mother.eligible_family_no || 'Pending'}
          </Text>
        </Text>
        {mother.gn_division && (
          <View style={styles.gnBadge}>
            <Text style={styles.gnBadgeText}>{mother.gn_division}</Text>
          </View>
        )}
      </View>

      {mother.husband_name ? (
        <Text style={styles.husbandText}>
          {t('mother.husbandName', "Husband's Name")}: {mother.husband_name}
        </Text>
      ) : null}

      {mother.address ? (
        <View style={styles.addressRow}>
          <Text style={styles.addressText}>📍 {mother.address}</Text>
        </View>
      ) : null}

      {/* Action Row: Directions (Maps), Pin GPS & Transfer Handover */}
      <View style={styles.actionToolbar}>
        {hasGps ? (
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.directionsBtn}
            onPress={handleOpenMapsDirections}
          >
            <Text style={styles.directionsBtnIcon}>🧭</Text>
            <Text style={styles.directionsBtnText}>{t('gps.getDirections', 'Directions (Maps)')}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.pinGpsBtn, hasGps && styles.pinGpsBtnOutline]}
          onPress={handlePinGps}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={hasGps ? '#0D9488' : '#FFFFFF'} />
          ) : (
            <Text style={[styles.pinGpsBtnText, hasGps && styles.pinGpsBtnTextOutline]}>
              {hasGps ? '📍 Update GPS' : '📍 Pin Home GPS'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.transferActionBtn}
          onPress={onOpenTransferModal}
        >
          <Text style={styles.transferActionBtnText}>🔄 Relocate / Transfer</Text>
        </TouchableOpacity>

        {onOpenPortalModal && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.portalActionBtn}
            onPress={onOpenPortalModal}
          >
            <Text style={styles.portalActionBtnText}>📱 Mother Portal Access</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Clinic QR Modal */}
      {showClinicQrModal && (
        <Modal
          visible={showClinicQrModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowClinicQrModal(false)}
        >
          <View style={styles.qrModalOverlay}>
            <View style={styles.qrModalCard}>
              <View style={styles.qrModalHeader}>
                <Text style={styles.qrModalTitle}>සායනික හඳුනාගැනීමේ QR කේතය</Text>
                <Text style={styles.qrModalSub}>H512 Clinical Identity QR</Text>
              </View>

              <View style={styles.qrSvgWrapper}>
                {qrMatrix.length > 0 && (
                  <Svg
                    width={200}
                    height={200}
                    viewBox={`0 0 ${qrMatrix.length * 7 + 28} ${qrMatrix.length * 7 + 28}`}
                  >
                    <Rect
                      width={qrMatrix.length * 7 + 28}
                      height={qrMatrix.length * 7 + 28}
                      fill="#FFFFFF"
                    />
                    {qrMatrix.map((row, r) =>
                      row.map((col, c) =>
                        col ? (
                          <Rect
                            key={`${r}-${c}`}
                            x={14 + c * 7}
                            y={14 + r * 7}
                            width={7}
                            height={7}
                            fill="#000000"
                          />
                        ) : null
                      )
                    )}
                  </Svg>
                )}
              </View>

              <View style={styles.qrModalTokenBadge}>
                <Text style={styles.qrModalTokenText}>{mother.qr_token}</Text>
              </View>

              <View style={styles.qrModalDetails}>
                <Text style={styles.qrModalName}>{mother.full_name}</Text>
                {mother.nic ? <Text style={styles.qrModalNic}>NIC: {mother.nic}</Text> : null}
                <Text style={styles.qrModalInstruction}>
                  වෙනත් PHM නිලධාරිනියකට මෙම QR කේතය ඇගේ ඇප් එකෙන් ස්කෑන් කළ හැක.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.qrModalCloseBtn}
                onPress={() => setShowClinicQrModal(false)}
              >
                <Text style={styles.qrModalCloseBtnText}>{t('common.close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusPillAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillAmberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  statusPillSlate: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusPillSlateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  qrBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tempOutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  tempOutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  tempOutSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  tempOutNote: {
    fontSize: 11.5,
    color: '#78350F',
    marginTop: 2,
  },
  returnBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  transferredBanner: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  transferredTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  transferredSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  name: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  familyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  familyText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  gnBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  gnBadgeText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
  },
  husbandText: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 4,
  },
  addressRow: {
    marginTop: 2,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 12.5,
    color: '#475569',
  },
  actionToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  directionsBtnIcon: {
    fontSize: 13,
  },
  directionsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pinGpsBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
  },
  pinGpsBtnOutline: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  pinGpsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pinGpsBtnTextOutline: {
    color: '#0D9488',
  },
  transferActionBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
  },
  transferActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  portalActionBtn: {
    backgroundColor: '#FAF5FF',
    borderColor: '#D8B4FE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
  },
  portalActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7E22CE',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  qrModalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrModalSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  qrSvgWrapper: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  qrModalTokenBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 10,
  },
  qrModalTokenText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
    fontFamily: 'monospace',
  },
  qrModalDetails: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrModalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  qrModalNic: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  qrModalInstruction: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
  },
  qrModalCloseBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  qrModalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
