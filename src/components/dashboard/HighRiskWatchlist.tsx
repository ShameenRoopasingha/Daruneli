import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MotherWithPregnancy } from '@/src/db';
import { RiskBadge } from '@/src/components/RiskBadge';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

interface HighRiskWatchlistProps {
  mothers: MotherWithPregnancy[];
  onCall: (phone?: string) => void;
  onWhatsApp: (phone?: string, name?: string) => void;
}

export const HighRiskWatchlist: React.FC<HighRiskWatchlistProps> = ({
  mothers,
  onCall,
  onWhatsApp,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <View style={[styles.sectionBulletDot, { backgroundColor: COLORS.risk.red.dot }]} />
          <Text style={styles.sectionTitle}>
            {t('dashboard.redWatchlist', 'High-Risk (RED-Tag) Watchlist')}
          </Text>
        </View>
        <View style={styles.badgeSmall}>
          <Text style={styles.badgeSmallText}>{mothers.length}</Text>
        </View>
      </View>

      {mothers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No high-risk mothers currently flagged</Text>
        </View>
      ) : (
        mothers.map((mother) => {
          let riskFactors: string[] = [];
          try {
            riskFactors = JSON.parse((mother as any).preg_risk_factors || '[]');
          } catch {
            riskFactors = [];
          }

          return (
            <View key={mother.id} style={styles.redWatchCard}>
              <View style={styles.redCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.motherName}>{mother.full_name}</Text>
                  <Text style={styles.motherInfo}>
                    NIC: {mother.nic || 'N/A'} • {mother.gn_division || 'Unassigned'}
                  </Text>
                </View>
                <RiskBadge level="RED" score={mother.risk_score} />
              </View>

              {/* Risk Reasons Chips */}
              {riskFactors.length > 0 && (
                <View style={styles.reasonsList}>
                  {riskFactors.map((rf, idx) => (
                    <View key={idx} style={styles.reasonChip}>
                      <Text style={styles.reasonText}>• {rf}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons: 1-Tap Call, WhatsApp, Log Visit */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() => onCall(mother.phone)}
                >
                  <Text style={styles.callBtnText}>📞 {t('dashboard.call', 'Call')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.actionBtn, styles.whatsappBtn]}
                  onPress={() => onWhatsApp(mother.phone, mother.full_name)}
                >
                  <Text style={styles.whatsappBtnText}>💬 {t('dashboard.whatsapp', 'WhatsApp')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.actionBtn, styles.visitBtn]}
                  onPress={() => {
                    if (mother.pregnancy_id) {
                      router.push(`/mother/visit/${mother.pregnancy_id}` as any);
                    } else {
                      router.push(`/mother/${mother.id}` as any);
                    }
                  }}
                >
                  <Text style={styles.visitBtnText}>📝 {t('mother.newVisit', 'Log Visit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  badgeSmall: {
    backgroundColor: COLORS.risk.red.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
  },
  badgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.risk.red.text,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  redWatchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
    ...SHADOWS.card,
  },
  redCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  motherName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  motherInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  reasonChip: {
    backgroundColor: COLORS.risk.red.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  reasonText: {
    fontSize: 11,
    color: COLORS.risk.red.text,
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  callBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  whatsappBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  visitBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  visitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
});
