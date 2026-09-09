import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { colors } from '@/theme';

/**
 * Classic tabs rather than expo-router's native tabs: native tabs need a
 * development build and Expo Go is the test target for now (DECISIONS.md).
 * The icons are SF Symbols either way, so swapping later is this file only.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ale,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.canvas, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'map.fill' : 'map'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'bubble.left.and.bubble.right.fill' : 'bubble.left.and.bubble.right'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'trophy.fill' : 'trophy'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Mates',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'person.2.fill' : 'person.2'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'person.crop.circle.fill' : 'person.crop.circle'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
