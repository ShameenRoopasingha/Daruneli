import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme/tokens';

export default function ModalScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        accessibilityLabel="Close modal"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.title}>දරුනැළි (DaruNali) PHM Companion</Text>
      <Text style={styles.subtitle}>
        {t('app.tagline', 'පවුල් සෞඛ්‍ය සේවා නිලධාරිනී ඩිජිටල් සහකාරකය')}
      </Text>
      <View style={styles.separator} />
      <Text style={styles.desc}>
        Offline-first mobile application designed to eliminate paperwork, prevent missed visits,
        detect early miscarriage and high-risk pregnancies, and track child nutrition and immunization.
      </Text>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.doneBtnText}>{t('common.close', 'වසන්න')}</Text>
      </TouchableOpacity>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
  },
  closeBtn: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '80%',
    backgroundColor: COLORS.borderSubtle,
  },
  desc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: RADIUS.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  doneBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 14,
  },
});
