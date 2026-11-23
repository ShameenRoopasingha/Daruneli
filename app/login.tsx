import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseConfigured } from '@/src/sync';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const configured = isSupabaseConfigured();

  const handleSignIn = async () => {
    if (!configured) {
      Alert.alert(
        'Offline Demo Mode',
        'Supabase cloud credentials are not configured in .env. Tap "Continue Offline" to use the complete local dataset without login.',
        [{ text: 'Continue Offline', onPress: () => router.replace('/(tabs)' as any) }]
      );
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        Alert.alert('Sign In Failed', error.message);
      } else if (data.session) {
        Alert.alert('Signed In', `Welcome back, ${data.user.email}!`, [
          { text: 'Open Dashboard', onPress: () => router.replace('/(tabs)' as any) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Sign In Error', err?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueOffline = () => {
    router.replace('/(tabs)' as any);
  };

  const toggleLang = () => {
    const next = i18n.language === 'si' ? 'en' : 'si';
    i18n.changeLanguage(next);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Language switcher */}
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.7} style={styles.langBtn} onPress={toggleLang}>
            <Text style={styles.langText}>🌐 {i18n.language === 'si' ? 'English' : 'සිංහල'}</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require('@/assets/images/daruneli-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandSubtitle}>
            A Digital Health Platform for Public Health Midwives (PHM)
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>PHM Cloud Sync Portal</Text>
          <Text style={styles.cardSub}>
            Sign in to sync your local field records with MOH Central Servers.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Staff Email</Text>
            <TextInput
              style={styles.input}
              placeholder="midwife@health.gov.lk"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('login.password', 'මුරපදය')}</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            disabled={isLoading}
            onPress={handleSignIn}
            accessibilityRole="button"
            accessibilityState={{ busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {t('login.signIn', 'වලාකුළු දත්ත සමමුහුර්ත පිවිසුම')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick-fill button for testing */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.quickFillBtn}
            onPress={() => {
              setEmail('midwife@health.gov.lk');
              setPassword('phm12345');
            }}
          >
            <Text style={styles.quickFillText}>
              🔑 Quick-Fill PHM Staff (midwife@health.gov.lk)
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 100% Offline Demo Fallback Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.offlineBtn}
            onPress={handleContinueOffline}
          >
            <Text style={styles.offlineBtnText}>
              ⚡ Continue Offline (Demo Field Mode)
            </Text>
          </TouchableOpacity>

          {!configured && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                Running in Offline-First Demo Mode. All features (visits, registrations, growth analysis, risk scoring, H509 PDF reports) work 100% offline using on-device SQLite.
              </Text>
            </View>
          )}
        </View>

        {/* Ministry of Health & Daruneli Footer */}
        <View style={styles.footerBrand}>
          <Image
            source={require('@/assets/images/sri-lanka-emblem.png')}
            style={styles.footerEmblem}
            resizeMode="contain"
          />
          <Text style={styles.footerMinistry}>MINISTRY OF HEALTH, SRI LANKA</Text>
          <Text style={styles.footerBitgard}>Daruneli Maternal & Child Health System</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  langBtn: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minHeight: 44,
    minWidth: 90,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 250,
    height: 125,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  footerBrand: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 12,
  },
  footerEmblem: {
    width: 24,
    height: 34,
    marginBottom: 6,
    opacity: 0.95,
  },
  footerMinistry: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  footerBitgard: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
  },
  mohBadge: {
    backgroundColor: COLORS.risk.green.bg,
    borderWidth: 1,
    borderColor: COLORS.risk.green.border,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    marginTop: 10,
  },
  mohText: {
    color: COLORS.risk.green.text,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cardHeader: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceSubtle,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  quickFillBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 44,
  },
  quickFillText: {
    color: '#0D9488',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  offlineBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  offlineBtnText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  demoNotice: {
    backgroundColor: COLORS.surfaceSubtle,
    padding: 12,
    borderRadius: RADIUS.sm,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  demoNoticeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
