import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import '@/src/i18n'; // Initialize i18n
import { getDatabase } from '@/src/db/database';
import { seedDatabase } from '@/src/db/seed';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize SQLite DB & Seed default data if first launch
        await getDatabase();
        await seedDatabase(false);
        setDbReady(true);
      } catch (e: any) {
        console.error('Initialization error:', e);
        setInitError(e?.message || 'Database initialization failed');
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>
          {initError ? `Error: ${initError}` : 'දරුනැළි (DaruNali) - Initializing PHM Database...'}
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#0D9488',
          headerTitleStyle: {
            fontWeight: '800',
            color: '#0F172A',
            fontSize: 17,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'PHM Sign In', headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="mother/[id]"
          options={{
            title: 'Mother Profile',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="mother/register"
          options={{
            title: 'Register Mother',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="mother/visit/[pregId]"
          options={{
            title: 'Antenatal Visit',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="child/[id]"
          options={{
            title: 'Child Profile (CHDR)',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="child/log-growth/[id]"
          options={{
            title: 'Log Growth & Milestones',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0D9488',
    fontWeight: '600',
    textAlign: 'center',
  },
});
