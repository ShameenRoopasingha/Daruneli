import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { generateQrMatrix } from '@/src/utils/qrMatrix';
import { supabase } from '@/src/sync/supabaseClient';
import { COLORS, SHADOWS } from '@/src/theme/tokens';

interface MotherInviteModalProps {
  visible: boolean;
  onClose: () => void;
  motherId: string;
  motherName: string;
  motherPhone?: string | null;
  phmAreaId?: string;
}

function formatDmy(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

export const MotherInviteModal: React.FC<MotherInviteModalProps> = ({
  visible,
  onClose,
  motherId,
  motherName,
  motherPhone,
  phmAreaId,
}) => {
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [expiresAtDmy, setExpiresAtDmy] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const webBaseUrl =
    process.env.EXPO_PUBLIC_WEB_URL || 'https://daruneli.lk';
  const portalUrl = inviteCode
    ? `${webBaseUrl}/mother-portal/join?code=${inviteCode}`
    : `${webBaseUrl}/mother-portal/join`;

  const loadOrCreateInvite = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!supabase) {
        // Offline / Demo mode
        setInviteCode('DRN-74K');
        const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        setExpiresAtDmy(formatDmy(d.toISOString()));
        setLoading(false);
        return;
      }

      // Check for active invite in Supabase
      const { data: existing, error: fetchErr } = await supabase
        .from('mother_portal_invites')
        .select('invite_code, expires_at')
        .eq('mother_id', motherId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!fetchErr && existing && existing.length > 0) {
        setInviteCode(existing[0].invite_code);
        setExpiresAtDmy(formatDmy(existing[0].expires_at));
        setLoading(false);
        return;
      }

      // Call create-invite route or generate locally
      const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = 'DRN-';
      for (let i = 0; i < 3; i++) {
        code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
      }

      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inserted, error: insErr } = await supabase
        .from('mother_portal_invites')
        .insert({
          mother_id: motherId,
          phm_area_id: phmAreaId || 'a0000000-0000-0000-0000-000000000001',
          invite_code: code,
          expires_at: expires,
        })
        .select('invite_code, expires_at')
        .single();

      if (insErr || !inserted) {
        // Graceful offline fallback
        setInviteCode(code);
        setExpiresAtDmy(formatDmy(expires));
      } else {
        setInviteCode(inserted.invite_code);
        setExpiresAtDmy(formatDmy(inserted.expires_at));
      }
    } catch (err: any) {
      console.warn('Error fetching mother invite code:', err);
      // Graceful offline display
      setInviteCode('DRN-74K');
      const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setExpiresAtDmy(formatDmy(d.toISOString()));
    } finally {
      setLoading(false);
    }
  }, [motherId, phmAreaId]);

  useEffect(() => {
    if (!visible || !motherId) return;

    const timer = setTimeout(() => {
      loadOrCreateInvite();
    }, 0);

    return () => clearTimeout(timer);
  }, [visible, motherId, loadOrCreateInvite]);

  const handleShareWhatsApp = async () => {
    if (!inviteCode) return;

    const message =
      `ආයුබෝවන් ${motherName},\n` +
      `දරුනැලි (Daruneli) මව් සහ බිළිඳු සහකාරි පෝර්ටලයට එක්වන්න:\n` +
      `🔗 ${portalUrl}\n` +
      `🔑 ඔබගේ රහස්‍ය ආරාධනා කේතය: *${inviteCode}*\n` +
      `📅 වලංගු කාලය: ${expiresAtDmy} දක්වා.\n\n` +
      `வணக்கம் ${motherName}, தருநெலி (Daruneli) தாய் சேய் போர்ட்டலில் இணையவும். குறியீடு: *${inviteCode}*.\n\n` +
      `Ministry of Health • Family Health Bureau Sri Lanka • Powered by Bitgard`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = motherPhone
      ? `whatsapp://send?phone=${motherPhone.replace(/\D/g, '')}&text=${encoded}`
      : `whatsapp://send?text=${encoded}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encoded}`);
      }
    } catch {
      Alert.alert('Notice', 'Unable to launch WhatsApp automatically. Please copy the invite code.');
    }
  };

  // Render SVG QR Matrix
  const matrix = inviteCode ? generateQrMatrix(portalUrl) : [];
  const qrSize = 180;
  const moduleSize = matrix.length > 0 ? qrSize / matrix.length : 6;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Modal Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.modalTitle}>📱 Mother Portal Access</Text>
                <Text style={styles.modalSubtitle}>දරුනැලි මව් සහකාරි පෝර්ටලය • FHB</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mother Badge */}
            <View style={styles.patientBadge}>
              <Text style={styles.patientName}>👩 {motherName}</Text>
              <Text style={styles.patientPhone}>
                {motherPhone ? `📞 ${motherPhone}` : 'Direct Field Onboarding'}
              </Text>
            </View>

            {errorMsg && (
              <Text style={{ color: '#DC2626', fontSize: 11, textAlign: 'center', marginBottom: 8, fontWeight: '600' }}>
                {errorMsg}
              </Text>
            )}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Generating secure invite code...</Text>
              </View>
            ) : (
              <>
                {/* 6-Digit Confidential Invite Code */}
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>CONFIDENTIAL 6-CHAR INVITE CODE</Text>
                  <Text style={styles.codeText}>{inviteCode}</Text>
                  <Text style={styles.expiryText}>Valid until: {expiresAtDmy} (7 days)</Text>
                </View>

                {/* Scannable QR Code */}
                <View style={styles.qrWrapper}>
                  <View style={styles.qrInner}>
                    <Svg width={qrSize} height={qrSize}>
                      {matrix.map((row, r) =>
                        row.map((col, c) =>
                          col ? (
                            <Rect
                              key={`${r}-${c}`}
                              x={c * moduleSize}
                              y={r * moduleSize}
                              width={moduleSize}
                              height={moduleSize}
                              fill="#0F172A"
                            />
                          ) : null
                        )
                      )}
                    </Svg>
                  </View>
                  <Text style={styles.qrInstruction}>
                    Scan with camera to launch Mother Portal
                  </Text>
                </View>

                {/* Instructions */}
                <View style={styles.stepBox}>
                  <Text style={styles.stepText}>
                    1. මවගේ දුරකථනයෙන් මෙම QR කේතය Scan කරන්න.
                  </Text>
                  <Text style={styles.stepText}>
                    2. උපන් දිනය සහ රහස්‍ය 4-ඉලක්කම් PIN අංකයක් සකසන්න.
                  </Text>
                  <Text style={styles.stepText}>
                    3. දිනපතා දරු චලන (Cardiff Kicks) සහ එන්නත් විස්තර පරීක්ෂා කළ හැක.
                  </Text>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.whatsappBtn}
                  onPress={handleShareWhatsApp}
                >
                  <Text style={styles.whatsappBtnText}>💬 Share via WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.8} style={styles.doneBtn} onPress={onClose}>
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    padding: 20,
    ...SHADOWS.floating,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D9488',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  patientBadge: {
    width: '100%',
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  patientPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D9488',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 12,
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.8,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#6B21A8',
    letterSpacing: 3,
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  expiryText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#9333EA',
  },
  qrWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrInner: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  qrInstruction: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
  },
  stepBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepText: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 16,
    fontWeight: '500',
  },
  whatsappBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    ...SHADOWS.card,
  },
  whatsappBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
