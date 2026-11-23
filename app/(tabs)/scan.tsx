import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  getMotherByQR,
  getChildByQR,
  getAllMothers,
  getAllChildren,
  type MotherWithPregnancy,
  type Child,
} from '@/src/db';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mothersList, setMothersList] = useState<MotherWithPregnancy[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  useEffect(() => {
    async function loadDemoList() {
      try {
        const [mList, cList] = await Promise.all([getAllMothers(), getAllChildren()]);
        setMothersList(mList);
        setChildrenList(cList);
      } catch (e) {
        console.error('Failed to load demo list for QR simulation:', e);
      }
    }
    loadDemoList();
  }, []);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const cleanToken = data.trim();

      // Check if mother QR
      const mother = await getMotherByQR(cleanToken);
      if (mother) {
        router.push(`/mother/${mother.id}` as any);
        return;
      }

      // Check if child QR
      const child = await getChildByQR(cleanToken);
      if (child) {
        router.push(`/child/${child.id}` as any);
        return;
      }

      Alert.alert(
        'QR Code Not Recognized',
        `No mother or child found with QR Token: ${cleanToken}`,
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
    } catch (e: any) {
      Alert.alert('Scan Error', e?.message || 'Failed to process QR token');
      setScanned(false);
    }
  };

  const handleSimulateScan = (qrToken: string) => {
    handleBarcodeScanned({ data: qrToken });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. CAMERA SCANNER VIEW */}
      <View style={styles.cameraContainer}>
        {!permission ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Checking camera permissions...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <View style={styles.cameraIconCircle}>
              <Text style={styles.iconLarge}>📷</Text>
            </View>
            <Text style={styles.permissionTitle}>
              {t('scan.noCamera', 'Camera Access Required')}
            </Text>
            <Text style={styles.permissionSub}>
              Camera permission is required to scan Mother Clinic Cards and Child Health Records (CHDR).
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.permissionBtn}
              onPress={requestPermission}
            >
              <Text style={styles.permissionBtnText}>
                {t('scan.requestPermission', 'Grant Camera Access')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Target Reticle Overlay */}
            <View style={styles.reticleOverlay}>
              <View style={styles.reticleFrame} />
              <View style={styles.reticleHintBadge}>
                <Text style={styles.reticleHint}>
                  {scanned ? 'Processing QR...' : t('scan.scanning', 'Align QR Code within the frame')}
                </Text>
              </View>
            </View>

            {scanned && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.rescanBtn}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanBtnText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 2. SIMULATE QR SCAN (DEMO / EMULATOR PICKER) */}
      <View style={styles.demoSection}>
        <View style={styles.demoHeader}>
          <View style={styles.demoIconCircle}>
            <Text style={styles.demoIcon}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.demoTitle}>
              {t('scan.simulateTitle', 'Field Simulation (Quick Test)')}
            </Text>
            <Text style={styles.demoSub}>
              {t('scan.simulateDesc', 'Simulate scanning physical PHM Clinic Cards and CHDRs')}
            </Text>
          </View>
        </View>

        <Text style={styles.groupHeader}>MOTHERS — CLINIC CARDS</Text>
        <View style={styles.chipsGrid}>
          {mothersList.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              style={[
                styles.demoChip,
                m.risk_level === 'RED'
                  ? styles.chipRed
                  : m.risk_level === 'YELLOW'
                  ? styles.chipYellow
                  : styles.chipGreen,
              ]}
              onPress={() => handleSimulateScan(m.qr_token)}
            >
              <View style={styles.chipTopRow}>
                <View
                  style={[
                    styles.chipStatusDot,
                    {
                      backgroundColor:
                        m.risk_level === 'RED'
                          ? COLORS.risk.red.dot
                          : m.risk_level === 'YELLOW'
                          ? COLORS.risk.yellow.dot
                          : COLORS.risk.green.dot,
                    },
                  ]}
                />
                <Text style={styles.chipRiskTag}>{m.risk_level || 'GREEN'}</Text>
              </View>
              <Text style={styles.chipTitle} numberOfLines={1}>{m.full_name}</Text>
              <Text style={styles.chipToken}>{m.qr_token}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.groupHeader, { marginTop: 18 }]}>CHILDREN — CHDR CARDS</Text>
        <View style={styles.chipsGrid}>
          {childrenList.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.7}
              style={[
                styles.demoChip,
                c.growth_faltering_flag === 1 ? styles.chipRed : styles.chipTeal,
              ]}
              onPress={() => handleSimulateScan(c.qr_token)}
            >
              <View style={styles.chipTopRow}>
                <View
                  style={[
                    styles.chipStatusDot,
                    {
                      backgroundColor:
                        c.growth_faltering_flag === 1
                          ? COLORS.risk.red.dot
                          : COLORS.primary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.chipRiskTag,
                    c.growth_faltering_flag === 1 && { color: COLORS.risk.red.text },
                  ]}
                >
                  {c.growth_faltering_flag === 1 ? 'Faltering' : 'Normal'}
                </Text>
              </View>
              <Text style={styles.chipTitle} numberOfLines={1}>{c.full_name}</Text>
              <Text style={styles.chipToken}>{c.qr_token}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
  cameraContainer: {
    height: 270,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  reticleFrame: {
    width: 190,
    height: 190,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    backgroundColor: 'transparent',
  },
  reticleHintBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  reticleHint: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  rescanBtn: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    ...SHADOWS.floating,
  },
  rescanBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 13,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
  },
  cameraIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconLarge: {
    fontSize: 28,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  permissionSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    ...SHADOWS.floating,
  },
  permissionBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 13,
  },
  permissionText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  demoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSubtle,
    paddingBottom: 12,
  },
  demoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoIcon: {
    fontSize: 18,
  },
  demoTitle: {
    ...TYPOGRAPHY.h3,
  },
  demoSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  groupHeader: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  demoChip: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  chipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chipStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipRiskTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
  },
  chipRed: {
    backgroundColor: COLORS.risk.red.bg,
    borderColor: COLORS.risk.red.border,
  },
  chipYellow: {
    backgroundColor: COLORS.risk.yellow.bg,
    borderColor: COLORS.risk.yellow.border,
  },
  chipGreen: {
    backgroundColor: COLORS.risk.green.bg,
    borderColor: COLORS.risk.green.border,
  },
  chipTeal: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chipToken: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 3,
    fontWeight: '500',
  },
});
