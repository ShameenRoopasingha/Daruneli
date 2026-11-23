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
  type MotherWithPregnancy,
  type Pregnancy,
  type AntenatalVisit,
  type FetalKickLog,
  type PostnatalMeows,
} from '@/src/db';
import { DeliveryModal } from '@/src/components/DeliveryModal';
import {
  CardiffKickChart,
  GestationalWheelTool,
} from '@/src/components/charts';
import { TransferMotherModal } from '@/src/components/TransferMotherModal';
import {
  MotherProfileHeader,
  MotherOverviewTab,
  MotherChartsTab,
  MotherPostnatalTab,
} from '@/src/components/mother';
import { calculatePOA } from '@/src/engine/pregnancyCalc';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

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
  const [showTransferModal, setShowTransferModal] = useState(false);

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
        Alert.alert(t('common.error', 'Call Failed'), 'Unable to initiate phone call');
      });
    } else {
      Alert.alert(t('common.error', 'No Phone Number'), 'No phone number recorded for this mother');
    }
  };

  const handleWhatsApp = () => {
    if (mother?.phone) {
      const cleanPhone = mother.phone.replace(/^0/, '+94');
      const isSinhala = i18n.language === 'si';
      const msg = isSinhala
        ? `ආයුබෝවන් ${mother.full_name}, මම ඔබගේ PHM මහත්මියයි. ඔබගේ මීළඟ සායනික පරීක්ෂාව පිළිබඳ මතක් කිරීමකි.`
        : `Hello ${mother.full_name}, this is your Public Health Midwife with a reminder about your upcoming maternal health checkup.`;
      Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`).catch(() => {
        Alert.alert(t('common.error', 'WhatsApp Failed'), 'WhatsApp is not installed on this device.');
      });
    } else {
      Alert.alert(t('common.error', 'No Phone Number'), 'No phone number recorded for this mother');
    }
  };

  if (!mother) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading Mother Profile...')}</Text>
      </View>
    );
  }

  const poa = pregnancy?.lrmp_date ? calculatePOA(new Date(pregnancy.lrmp_date)) : null;
  const chartWidth = Math.max(windowWidth - 64, 280);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. IDENTITY & HEADER CARD (Includes GPS Pinning & Transfer actions) */}
      <MotherProfileHeader
        mother={mother}
        onRefresh={loadData}
        onOpenTransferModal={() => setShowTransferModal(true)}
      />

      {/* 2. SUB-NAV TABS */}
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

      {/* 3. ACTIVE TAB CONTENT (Lazy-Mounted SVG Charts) */}
      {activeTab === 'OVERVIEW' && (
        <MotherOverviewTab
          mother={mother}
          pregnancy={pregnancy}
          visits={visits}
          onPhoneCall={handleCall}
          onWhatsApp={handleWhatsApp}
          onLogVisit={() => {
            if (pregnancy) {
              router.push(`/mother/visit/${pregnancy.id}` as any);
            }
          }}
          onMarkDelivered={() => setShowDeliveryModal(true)}
        />
      )}

      {activeTab === 'ANTENATAL_CHARTS' && (
        <MotherChartsTab
          visits={visits}
          motherName={mother.full_name}
          pregnancy={pregnancy}
          chartWidth={chartWidth}
          onOpenWheel={() => setShowWheelModal(true)}
        />
      )}

      {activeTab === 'KICK_CHART' && (
        <CardiffKickChart
          pregnancyId={pregnancy?.id || ''}
          kickLogs={kickLogs}
          onRefreshLogs={loadData}
          poaWeeks={poa?.poaWeeks}
        />
      )}

      {activeTab === 'POSTNATAL_MEOWS' && (
        <MotherPostnatalTab
          pregnancy={pregnancy}
          meowsLogs={meowsLogs}
          onRefreshLogs={loadData}
        />
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

      {/* TRANSFER / TEMP-OUT MODAL */}
      <TransferMotherModal
        visible={showTransferModal}
        mother={mother}
        visits={visits}
        onClose={() => setShowTransferModal(false)}
        onTransferCompleted={() => {
          setShowTransferModal(false);
          loadData();
        }}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  subnavContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 2,
  },
  subnavPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  subnavPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subnavText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subnavTextActive: {
    color: COLORS.textWhite,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
});
