/* app/(tabs)/_layout.tsx */
import React from 'react';
import { Tabs } from 'expo-router';
import { Image, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const accentBlue = '#2A7DE1';

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#0B1220',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: accentBlue,
        tabBarInactiveTintColor: '#6B7280',
        tabBarButton: HapticTab,

        // Static header title
        headerTitle: () => (
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#0B1220',
            }}
          >
            Caladrius Medical Passport
          </Text>
        ),

        // Logo on the right
        headerRight: () => (
          <Image
            source={require('@/assets/images/logo.png')}
            style={{
              width: 56,
              height: 56,
              marginRight: 12,
              borderRadius: 10,
              backgroundColor: accentBlue,
              padding: 6,
            }}
            contentFit="contain"
          />
        ),
      }}
    >
      {/* User view */}
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* Admin view */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Data',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/pencil.png')}
              style={{ width: 26, height: 26, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
