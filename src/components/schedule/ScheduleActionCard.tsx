import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AutoPopulatedItem } from '@/src/db/repositories/scheduleRepo';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';

interface ScheduleActionCardProps {
  item: AutoPopulatedItem;
  isSi: boolean;
  onCall: (phone?: string) => void;
  onReschedule7d: (taskId: string, targetName: string) => void;
  onOpenManualReschedule: (item: AutoPopulatedItem) => void;
}

export const ScheduleActionCard: React.FC<ScheduleActionCardProps> = ({
  item,
  isSi,
  onCall,
  onReschedule7d,
  onOpenManualReschedule,
}) => {
  const router = useRouter();

  if (item.type === 'SUMMARY') {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.summaryTitle}>📊 {item.name}</Text>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{item.badgeText}</Text>
          </View>
        </View>
        <Text style={styles.summaryReason}>{item.reason}</Text>
        <TouchableOpacity
          style={styles.openH509Btn}
          onPress={() => router.push('/(tabs)/area')}
        >
          <Text style={styles.openH509BtnText}>
            {isSi ? 'H509 වාර්තාව සහ ප්‍රදේශ දළ විශ්ලේෂණය බලන්න ›' : 'Open H509 Monthly Report ›'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMother = item.type === 'MOTHER' || (item.type === 'TASK' && item.motherId);
  const profileId = item.motherId || item.childId || item.targetId;
  const hasGps = item.gps_lat !== null && item.gps_lat !== undefined && item.gps_lng !== null && item.gps_lng !== undefined;

  const handleOpenMaps = () => {
    if (!hasGps) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.gps_lat},${item.gps_lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps on this device.');
    });
  };

  return (
    <View style={styles.actionCard}>
      {/* Top row: Name, GN, & Status Badges */}
      <View style={styles.cardHeader}>
        <View style={styles.nameBlock}>
          <Text style={styles.targetName}>
            {item.childId ? '👶 ' : '🤰 '}
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            {item.gnDivision && (
              <Text style={styles.targetGn}>📍 {item.gnDivision}</Text>
            )}
            {hasGps && (
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.mapPill}
                onPress={handleOpenMaps}
              >
                <Text style={styles.mapPillText}>🗺️ Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.badgeWrapRow}>
          <View
            style={[
              styles.itemBadge,
              item.badgeColor === 'red'
                ? styles.badgeRed
                : item.badgeColor === 'yellow'
                ? styles.badgeYellow
                : item.badgeColor === 'blue'
                ? styles.badgeBlue
                : styles.badgeGreen,
            ]}
          >
            <Text
              style={[
                styles.itemBadgeText,
                item.badgeColor === 'red'
                  ? styles.badgeRedText
                  : item.badgeColor === 'yellow'
                  ? styles.badgeYellowText
                  : item.badgeColor === 'blue'
                  ? styles.badgeBlueText
                  : styles.badgeGreenText,
              ]}
            >
              {item.badgeText}
            </Text>
          </View>
        </View>
      </View>

      {/* Reason subtitle */}
      <Text style={styles.reasonText}>{item.reason}</Text>

      {/* 2x2 Action Button Grid (Prevents single-row button squishing) */}
      <View style={styles.grid2x2}>
        {/* ROW 1: Clinical Action + Profile */}
        <View style={styles.gridRow}>
          {/* Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.btnPrimary}
            onPress={() => {
              if (isMother) {
                if (item.pregnancyId) {
                  router.push(`/mother/visit/${item.pregnancyId}` as any);
                } else {
                  router.push(`/mother/${profileId}` as any);
                }
              } else {
                router.push(`/child/log-growth/${profileId}` as any);
              }
            }}
          >
            <Text style={styles.btnPrimaryText} numberOfLines={1}>
              📝 {isMother ? (isSi ? 'සංචාරය සටහන්' : 'Log Visit') : (isSi ? 'වර්ධනය / එන්නත්' : 'Growth / EPI')}
            </Text>
          </TouchableOpacity>

          {/* Profile Navigation Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.btnSecondary}
            onPress={() => {
              if (isMother) {
                router.push(`/mother/${profileId}`);
              } else {
                router.push(`/child/${profileId}`);
              }
            }}
          >
            <Text style={styles.btnSecondaryText} numberOfLines={1}>
              👤 {isSi ? 'ප්‍රොෆයිලය' : 'Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ROW 2: Communication + Rescheduling */}
        <View style={styles.gridRow}>
          {/* Col 1: Call Button or Map directions */}
          {item.phone ? (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.btnCall}
              onPress={() => onCall(item.phone)}
            >
              <Text style={styles.btnCallText} numberOfLines={1}>
                📞 {isSi ? 'අමතන්න' : 'Call'}
              </Text>
            </TouchableOpacity>
          ) : hasGps ? (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.btnDirections}
              onPress={handleOpenMaps}
            >
              <Text style={styles.btnDirectionsText} numberOfLines={1}>
                🧭 {isSi ? 'මග පෙන්වීම' : 'Directions'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.btnDate}
              onPress={() => onOpenManualReschedule(item)}
            >
              <Text style={styles.btnDateText} numberOfLines={1}>
                📅 {isSi ? 'දිනය' : 'Date'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Col 2: Rescheduling (+7d or Date picker) */}
          {item.taskId ? (
            <View style={styles.rescheduleSplitRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.btnReschedule7d}
                onPress={() => onReschedule7d(item.taskId!, item.name)}
              >
                <Text style={styles.btnReschedule7dText}>+7d</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.btnRescheduleDate}
                onPress={() => onOpenManualReschedule(item)}
              >
                <Text style={styles.btnRescheduleDateText} numberOfLines={1}>
                  📅 {isSi ? 'දිනය' : 'Date'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.btnDate}
              onPress={() => onOpenManualReschedule(item)}
            >
              <Text style={styles.btnDateText} numberOfLines={1}>
                📅 {isSi ? 'දිනය වෙනස්' : 'Reschedule'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameBlock: {
    flex: 1,
    marginRight: 8,
  },
  targetName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  targetGn: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  mapPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  mapPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeRed: {
    backgroundColor: COLORS.risk.red.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.red.border,
  },
  badgeRedText: {
    color: COLORS.risk.red.text,
  },
  badgeYellow: {
    backgroundColor: COLORS.risk.yellow.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.yellow.border,
  },
  badgeYellowText: {
    color: COLORS.risk.yellow.text,
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeBlueText: {
    color: '#1D4ED8',
  },
  badgeGreen: {
    backgroundColor: COLORS.risk.green.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.green.border,
  },
  badgeGreenText: {
    color: COLORS.risk.green.text,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  // 2x2 Button Grid
  grid2x2: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    flex: 1.2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  btnCall: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  btnDirections: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnDirectionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  btnDate: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  rescheduleSplitRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  btnReschedule7d: {
    flex: 0.8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnReschedule7dText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  btnRescheduleDate: {
    flex: 1.2,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  btnRescheduleDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...SHADOWS.card,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  summaryPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  summaryReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 8,
    lineHeight: 18,
  },
  openH509Btn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  openH509BtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
