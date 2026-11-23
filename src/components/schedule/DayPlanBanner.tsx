import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';
import { ResolvedDayPlan } from '@/src/engine/scheduleEngine';

interface DayPlanBannerProps {
  isSi: boolean;
  resolvedPlan: ResolvedDayPlan;
  isOverloaded: boolean;
  itemsCount: number;
  dailyCap: number;
  onOpenOverrideModal: () => void;
  onRevertOverride: () => void;
  onOpenAutoBalanceModal: () => void;
}

export const DayPlanBanner: React.FC<DayPlanBannerProps> = ({
  isSi,
  resolvedPlan,
  isOverloaded,
  itemsCount,
  dailyCap,
  onOpenOverrideModal,
  onRevertOverride,
  onOpenAutoBalanceModal,
}) => {
  return (
    <>
      {/* Selected Day Plan Banner */}
      <View style={[styles.planBanner, resolvedPlan.is_override && styles.planBannerOverride]}>
        <View style={styles.bannerHeaderRow}>
          <View style={styles.bannerBadgeContainer}>
            <View
              style={[
                styles.activityBadge,
                resolvedPlan.activity_type === 'ANC_CLINIC' || resolvedPlan.activity_type === 'CWC_CLINIC'
                  ? styles.badgeClinic
                  : resolvedPlan.activity_type === 'HOME_VISIT'
                  ? styles.badgeHome
                  : resolvedPlan.activity_type === 'MOH_OFFICE'
                  ? styles.badgeOffice
                  : styles.badgeRest,
              ]}
            >
              <Text style={styles.activityBadgeText}>
                {resolvedPlan.activity_type === 'ANC_CLINIC'
                  ? '🤰 ' + (isSi ? 'පූර්ව ප්‍රසව සායනය' : 'ANC Clinic')
                  : resolvedPlan.activity_type === 'CWC_CLINIC'
                  ? '👶 ' + (isSi ? 'ළමා සායනය / එන්නත්' : 'CWC Clinic')
                  : resolvedPlan.activity_type === 'HOME_VISIT'
                  ? '🏡 ' + (isSi ? 'ගෘහ චාරිකා' : 'Home Visits')
                  : resolvedPlan.activity_type === 'MOH_OFFICE'
                  ? '🏢 ' + (isSi ? 'කාර්යාල දිනය' : 'MOH Office')
                  : resolvedPlan.activity_type === 'CATCH_UP'
                  ? '⚡ ' + (isSi ? 'මගහැරුණු චාරිකා' : 'Catch-Up')
                  : '☕ ' + (isSi ? 'විවේක දිනය' : 'Rest / Off')}
              </Text>
            </View>

            {resolvedPlan.is_override && (
              <View style={styles.modifiedPill}>
                <Text style={styles.modifiedPillText}>
                  ✏️ {isSi ? 'වෙනස් කළ දිනයකි' : 'Modified'}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.overrideBtn}
            onPress={onOpenOverrideModal}
          >
            <Text style={styles.overrideBtnText}>
              {isSi ? 'දිනය වෙනස් කරන්න' : 'Override Day'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.planTitle}>{resolvedPlan.title}</Text>

        <View style={styles.planMetaRow}>
          {resolvedPlan.gn_division && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>📍 {resolvedPlan.gn_division}</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              ⏰ {resolvedPlan.start_time} – {resolvedPlan.end_time}
            </Text>
          </View>
        </View>

        {resolvedPlan.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>📝 {resolvedPlan.notes}</Text>
          </View>
        )}

        {resolvedPlan.is_override && (
          <TouchableOpacity
            style={styles.resetPlanLink}
            onPress={onRevertOverride}
          >
            <Text style={styles.resetPlanLinkText}>
              ↺ {isSi ? 'මුල් සතිපතා සැලසුමට යළි සකසන්න' : 'Revert to Master Timetable'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* OVERLOAD ALERT BANNER (ONLY for HOME_VISIT days exceeding cap) */}
      {isOverloaded && (
        <View style={styles.overloadBanner}>
          <View style={styles.overloadBannerLeft}>
            <Text style={styles.overloadAlertIcon}>⚠️</Text>
            <View style={styles.overloadInfo}>
              <View style={styles.overloadHeaderRow}>
                <Text style={styles.overloadTitle}>
                  {isSi ? 'වැඩ බර අධික දිනයකි' : 'Day Overloaded'}
                </Text>
                <View style={styles.overloadCountPill}>
                  <Text style={styles.overloadCountText}>
                    {itemsCount} / {dailyCap} {isSi ? 'චාරිකා' : 'Visits'}
                  </Text>
                </View>
              </View>
              <Text style={styles.overloadSub}>
                {isSi
                  ? `දෛනික සීමාවට (${dailyCap}) වඩා චාරිකා ${itemsCount - dailyCap} ක් වැඩියි. අඩු අවදානම් චාරිකා සෙනසුරාදාට හෝ වෙනත් දිනවලට ස්වයංක්‍රීයව තුලනය කළ හැක.`
                  : `Exceeds daily cap by ${itemsCount - dailyCap} visits. High-risk visits will remain locked.`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.autoBalanceBtn}
            onPress={onOpenAutoBalanceModal}
          >
            <Text style={styles.autoBalanceBtnText}>
              ⚡ {isSi ? 'ස්වයංක්‍රීය තුලනය' : 'Auto-Balance'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  planBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  planBannerOverride: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  activityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeClinic: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeHome: {
    backgroundColor: COLORS.risk.green.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.green.border,
  },
  badgeOffice: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  badgeRest: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modifiedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  modifiedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  overrideBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  overrideBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  planMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  notesBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  resetPlanLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  resetPlanLinkText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  overloadBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    ...SHADOWS.card,
  },
  overloadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  overloadAlertIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  overloadInfo: {
    flex: 1,
  },
  overloadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  overloadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  overloadCountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  overloadCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  overloadSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  autoBalanceBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  autoBalanceBtnText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
});
