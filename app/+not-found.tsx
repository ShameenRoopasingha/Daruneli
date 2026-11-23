import { Link, Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme/tokens';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.title}>
          {t('directory.noResults', 'පිටුව හමු නොවීය (Screen Not Found)')}
        </Text>
        <Text style={styles.subtitle}>
          The requested clinical screen is not available or has been moved.
        </Text>

        <Link href="/" asChild>
          <TouchableOpacity style={styles.homeBtn} activeOpacity={0.8}>
            <Text style={styles.homeBtnText}>
              {t('common.goHome', 'මුල් පිටුවට යන්න (Go to Home)')}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.canvas,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  homeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  homeBtnText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});
