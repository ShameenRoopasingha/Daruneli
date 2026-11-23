import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS } from '../theme';

export type RiskTier = 'GREEN' | 'YELLOW' | 'RED';

interface RiskBadgeProps {
  level: RiskTier;
  score?: number;
  showFollowUp?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  showFollowUp = false,
  size = 'md',
}) => {
  const { t } = useTranslation();

  const getStyleTokens = () => {
    switch (level) {
      case 'RED':
        return {
          ...COLORS.risk.red,
          label: t('risk.red', 'HIGH RISK'),
          days: 7,
        };
      case 'YELLOW':
        return {
          ...COLORS.risk.yellow,
          label: t('risk.yellow', 'MODERATE RISK'),
          days: 14,
        };
      case 'GREEN':
      default:
        return {
          ...COLORS.risk.green,
          label: t('risk.green', 'LOW RISK'),
          days: 28,
        };
    }
  };

  const c = getStyleTokens();
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            paddingVertical: isSmall ? 3 : isLarge ? 8 : 5,
            paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: c.dot }]} />
        <Text
          style={[
            styles.label,
            {
              color: c.text,
              fontSize: isSmall ? 10 : isLarge ? 13 : 11,
            },
          ]}
        >
          {c.label}
          {score !== undefined && score > 0 ? ` • ${score}` : ''}
        </Text>
      </View>

      {showFollowUp && (
        <View style={[styles.followUpPill, { backgroundColor: c.bg }]}>
          <Text style={[styles.followUpText, { color: c.text }]}>
            {t('risk.followUp', { days: c.days, defaultValue: `Review in ${c.days}d` })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  followUpPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  followUpText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
