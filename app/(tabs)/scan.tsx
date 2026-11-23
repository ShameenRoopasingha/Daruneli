import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  getMotherByQR,
  getMotherById,
  getMotherByNIC,
  getChildByQR,
  getAllMothers,
  getAllChildren,
  type MotherWithPregnancy,
  type Child,
} from '@/src/db';
import { QrCodeScanSchema } from '@/src/validations';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [mothersList, setMothersList] = useState<MotherWithPregnancy[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  // Automatically reset scanned state when the screen regains focus
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
    }, [])
  );

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

  const handleBarcodeScanned = async (event: any) => {
    if (scanned) return;
    setScanned(true);

    try {
      // 1. Safe extraction across Web, Native, and Simulated events
      let rawData = '';
      if (typeof event === 'string') {
        rawData = event;
      } else if (event?.data && typeof event.data === 'string') {
        rawData = event.data;
      } else if (event?.nativeEvent?.data && typeof event.nativeEvent.data === 'string') {
        rawData = event.nativeEvent.data;
      } else if (event?.raw && typeof event.raw === 'string') {
        rawData = event.raw;
      }

      let cleanToken = rawData.trim();
      if (!cleanToken) {
        setScanned(false);
        return;
      }

      // 2. Extract token from URL query parameters (e.g. ?token=..., ?code=..., ?nic=...)
      if (cleanToken.includes('token=')) {
        const match = cleanToken.match(/[?&]token=([^&]+)/);
        if (match) cleanToken = decodeURIComponent(match[1]);
      } else if (cleanToken.includes('code=')) {
        const match = cleanToken.match(/[?&]code=([^&]+)/);
        if (match) cleanToken = decodeURIComponent(match[1]);
      } else if (cleanToken.includes('nic=')) {
        const match = cleanToken.match(/[?&]nic=([^&]+)/);
        if (match) cleanToken = decodeURIComponent(match[1]);
      }

      // 3. Extract token from URL path segments (e.g. /mother/..., /m/..., /child/..., /c/...)
      if (cleanToken.includes('/mother/')) {
        const parts = cleanToken.split('/mother/');
        if (parts[1]) cleanToken = parts[1].split(/[?#/]/)[0];
      } else if (cleanToken.includes('/m/')) {
        const parts = cleanToken.split('/m/');
        if (parts[1]) cleanToken = parts[1].split(/[?#/]/)[0];
      } else if (cleanToken.includes('/child/')) {
        const parts = cleanToken.split('/child/');
        if (parts[1]) cleanToken = parts[1].split(/[?#/]/)[0];
      } else if (cleanToken.includes('/c/')) {
        const parts = cleanToken.split('/c/');
        if (parts[1]) cleanToken = parts[1].split(/[?#/]/)[0];
      }

      // Validate extracted token using QrCodeScanSchema
      const scanValidation = QrCodeScanSchema.safeParse({ token: cleanToken });
      if (!scanValidation.success) {
        const errMsg = scanValidation.error.issues[0]?.message || 'Invalid QR code token';
        Alert.alert(
          t('scan.unrecognized', 'QR කේතය හඳුනාගත නොහැක'),
          errMsg,
          [{ text: t('scan.again', 'නැවත ස්කෑන් කරන්න'), onPress: () => setScanned(false) }]
        );
        return;
      }

      // 4. Resolve Mother: QR Token -> ID -> NIC -> MOTH- prefix -> Demo Invite Code
      let mother = await getMotherByQR(cleanToken);
      if (!mother) {
        mother = (await getMotherById(cleanToken)) as any;
      }
      if (!mother) {
        mother = (await getMotherByNIC(cleanToken)) as any;
      }
      if (!mother && cleanToken.toUpperCase().startsWith('MOTH-')) {
        const strippedNic = cleanToken.replace(/^MOTH-/i, '').trim();
        mother = (await getMotherByNIC(strippedNic)) as any;
      }
      // Demo invite code support: DRN-74K -> Inoka Dilhani (917654321V)
      if (!mother && cleanToken.toUpperCase() === 'DRN-74K') {
        mother = (await getMotherByNIC('917654321V')) as any;
      }

      if (mother) {
        router.push(`/mother/${mother.id}` as any);
        return;
      }

      // 5. Resolve Child: QR Token -> ID -> CHLD- prefix
      const child = await getChildByQR(cleanToken);
      if (child) {
        router.push(`/child/${child.id}` as any);
        return;
      }

      Alert.alert(
        t('scan.unrecognized', 'QR කේතය හඳුනාගත නොහැක'),
        `No mother or child record matches: "${cleanToken}"\n\nකරුණාකර වලංගු සායනික QR කේතයක් හෝ ජා.හැ. අංකයක් භාවිත කරන්න.`,
        [{ text: t('scan.again', 'නැවත ස්කෑන් කරන්න'), onPress: () => setScanned(false) }]
      );
    } catch (e: any) {
      Alert.alert(t('common.error', 'දෝෂයකි'), e?.message || 'Failed to process QR token');
      setScanned(false);
    }
  };

  const handleManualSearch = async () => {
    const code = manualCode.trim();
    const validation = QrCodeScanSchema.safeParse({ token: code });
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Token must be at least 3 characters';
      setManualError(errMsg);
      Alert.alert(t('common.error', 'දෝෂයකි'), errMsg);
      return;
    }
    setManualError(null);
    setSearching(true);
    await handleBarcodeScanned(code);
    setSearching(false);
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
              {!scanned && (
                <View style={styles.reticleHintBadge}>
                  <Text style={styles.reticleHint}>
                    {t('scan.scanning', 'QR කේතය රාමුව තුළ තබන්න...')}
                  </Text>
                </View>
              )}
            </View>

            {scanned && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.rescanBtn}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanBtnText}>
                  {t('scan.again', 'නැවත ස්කෑන් කරන්න')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 2. MANUAL LOOKUP SECTION (FOR FIELD RESILIENCE / DESKTOP / DAMAGED QR) */}
      <View style={styles.manualSearchCard}>
        <View style={styles.manualHeaderRow}>
          <Text style={styles.manualSearchIcon}>⌨️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.manualSearchTitle}>
              {t('scan.manualTitle', 'ජා.හැ. අංකය / QR Token / Invite Code මගින් සෙවීම')}
            </Text>
            <Text style={styles.manualSearchSub}>
              {t('scan.manualSub', 'කැමරාව නොමැති විට හෝ QR කේතය කියවිය නොහැකි විට භාවිත කරන්න')}
            </Text>
          </View>
        </View>
        <View style={styles.manualInputRow}>
          <TextInput
            style={[styles.manualInput, manualError ? styles.inputError : null]}
            placeholder="e.g. 917654321V, MOTH-917654321V, DRN-74K"
            placeholderTextColor={COLORS.textTertiary}
            value={manualCode}
            onChangeText={(txt) => {
              setManualCode(txt);
              if (manualError) setManualError(null);
            }}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleManualSearch}
          />
          <TouchableOpacity
            style={[styles.manualSearchBtn, !manualCode.trim() && styles.manualSearchBtnDisabled]}
            disabled={!manualCode.trim() || searching}
            onPress={handleManualSearch}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.manualSearchBtnText}>{t('common.search', 'සොයන්න')}</Text>
            )}
          </TouchableOpacity>
        </View>
        {manualError ? (
          <Text style={styles.errorText}>⚠ {manualError}</Text>
        ) : null}
      </View>

      {/* 3. SIMULATE QR SCAN (DEMO / EMULATOR PICKER) */}
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

        <Text style={styles.groupHeader}>
          {t('scan.mothersCards', 'මව්වරුන්ගේ සායනික කාඩ්පත්')}
        </Text>
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
                <Text style={styles.chipRiskTag}>
                  {m.risk_level === 'RED'
                    ? t('risk.red', 'අධි')
                    : m.risk_level === 'YELLOW'
                    ? t('risk.yellow', 'මධ්‍යම')
                    : t('risk.green', 'අඩු')}
                </Text>
              </View>
              <Text style={styles.chipTitle} numberOfLines={2}>{m.full_name}</Text>
              <Text style={styles.chipToken}>{m.qr_token}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.groupHeader, { marginTop: 18 }]}>
          {t('scan.childrenCards', 'දරුවන්ගේ CHDR කාඩ්පත්')}
        </Text>
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
                  {c.growth_faltering_flag === 1
                    ? t('child.growthFaltering', 'වර්ධනය අඩාල')
                    : t('child.normal', 'සාමාන්‍ය')}
                </Text>
              </View>
              <Text style={styles.chipTitle} numberOfLines={2}>{c.full_name}</Text>
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
  manualSearchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  manualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  manualSearchIcon: {
    fontSize: 20,
  },
  manualSearchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  manualSearchSub: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.risk.red.accent,
    backgroundColor: COLORS.risk.red.bg,
  },
  errorText: {
    color: COLORS.risk.red.text,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 6,
  },
  manualSearchBtn: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSearchBtnDisabled: {
    opacity: 0.5,
  },
  manualSearchBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
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
