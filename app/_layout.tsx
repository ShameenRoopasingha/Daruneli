import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, AppState, AppStateStatus, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import 'react-native-reanimated';

import '@/src/i18n'; // Initialize i18n
import { getDatabase } from '@/src/db/database';
import { seedDatabase } from '@/src/db/seed';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme/tokens';
import { isLockEnabled, hasPinSet, shouldLockApp } from '@/src/security/authLock';
import { AppLockScreen } from '@/src/components/AppLockScreen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const lastBackgroundRef = useRef<number>(0);

  useEffect(() => {
    // Check initial lock state on startup
    async function checkInitialLock() {
      const enabled = await isLockEnabled();
      const hasPin = await hasPinSet();
      if (enabled && hasPin) {
        setIsLocked(true);
      }
    }
    void checkInitialLock();

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lastBackgroundRef.current = Date.now();
      } else if (nextState === 'active') {
        const needsLock = await shouldLockApp(lastBackgroundRef.current);
        if (needsLock) {
          setIsLocked(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function prepare() {
      try {
        await getDatabase();
        await seedDatabase(false);
        if (mounted) setDbReady(true);
      } catch (e: any) {
        console.error('Initialization error:', e);
        if (mounted) setInitError(e?.message || 'Database initialization failed');
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRetry = async () => {
    setInitError(null);
    try {
      await getDatabase();
      await seedDatabase(false);
      setDbReady(true);
    } catch (e: any) {
      console.error('Retry error:', e);
      setInitError(e?.message || 'Database initialization failed');
    }
  };

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        {initError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>
              {t('common.error', 'දෝෂයකි')}: දත්ත පද්ධතිය ආරම්භ කිරීම අසාර්ථකයි
            </Text>
            <Text style={styles.errorSubtitle}>{initError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.8}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>
                {t('common.retry', 'නැවත උත්සාහ කරන්න')} (Retry)
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              දරුනැළි (DaruNali) - {t('common.syncing', 'දත්ත පද්ධතිය සක්‍රිය වෙමින් පවතී...')}
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.surface,
          },
          headerTintColor: COLORS.primary,
          headerTitleStyle: {
            fontWeight: '700',
            color: COLORS.textPrimary,
            fontSize: 17,
          },
          headerShadowVisible: false,
          headerBackTitle: t('common.back', 'ආපසු'),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            title: t('screens.login', 'කාර්ය මණ්ඩල පිවිසුම'),
            headerBackTitle: t('common.back', 'ආපසු'),
          }}
        />
        <Stack.Screen
          name="mother/[id]"
          options={{
            title: t('screens.motherProfile', 'මවගේ තොරතුරු'),
            headerBackTitle: t('common.back', 'ආපසු'),
          }}
        />
        <Stack.Screen
          name="mother/register"
          options={{
            title: t('screens.registerMother', 'මවක් ලියාපදිංචි කිරීම'),
            headerBackTitle: t('common.back', 'ආපසු'),
          }}
        />
        <Stack.Screen
          name="mother/visit/[pregId]"
          options={{
            title: t('screens.antenatalVisit', 'පූර්ව ප්‍රසව සායනික සටහන'),
            headerBackTitle: t('common.back', 'ආපසු'),
          }}
        />
        <Stack.Screen
          name="child/[id]"
          options={{
            title: t('screens.childProfile', 'ළමා සෞඛ්‍ය සංවර්ධන වාර්තාව (CHDR)'),
            headerBackTitle: t('common.back', 'ආපසු'),
          }}
        />
        <Stack.Screen
          name="child/log-growth/[id]"
          options={{
            title: t('screens.logGrowth', 'වර්ධනය හා සංවර්ධනය සටහන් කිරීම'),
            headerBackTitle: t('common.back', 'ආපසු'),
          }}
        />
      </Stack>
      {isLocked && <AppLockScreen onUnlocked={() => setIsLocked(false)} />}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.primaryDark,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBox: {
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  retryButtonText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 14,
  },
});
