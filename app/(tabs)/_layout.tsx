import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/src/theme';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>{icon}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(15, 23, 42, 0.05)',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.03,
          shadowRadius: 10,
          elevation: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: COLORS.primary,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 17,
          color: COLORS.textPrimary,
          letterSpacing: -0.4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard', 'Today'),
          headerTitle: 'දරුනැළි • ' + t('dashboard.title', "Today's Dashboard"),
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t('tabs.schedule', 'Timetable'),
          headerTitle: t('schedule.title', 'Advance Programme'),
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" label="Schedule" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: t('tabs.directory', 'Directory'),
          headerTitle: t('directory.title', 'Mothers & Children'),
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="Directory" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan', 'Scan QR'),
          headerTitle: t('scan.title', 'QR Scanner'),
          tabBarIcon: ({ focused }) => <TabIcon icon="📷" label="Scan QR" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="area"
        options={{
          title: t('tabs.area', 'Area'),
          headerTitle: t('area.title', 'PHM Area Overview'),
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" label="Area" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 32,
    borderRadius: 16,
  },
  iconContainerFocused: {
    backgroundColor: COLORS.primaryLight,
  },
  iconText: {
    fontSize: 20,
    opacity: 0.7,
  },
  iconTextFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
});
