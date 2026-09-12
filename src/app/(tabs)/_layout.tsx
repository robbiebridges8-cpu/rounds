import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { useUnreadCount } from '@/lib/inbox';
import { colors } from '@/theme';

/**
 * Classic tabs rather than expo-router's native tabs: native tabs need a
 * development build and Expo Go is the test target for now (DECISIONS.md).
 * The icons are SF Symbols either way, so swapping later is this file only.
 */
export default function TabLayout() {
  const unread = useUnreadCount();
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
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.ale, color: '#fff', fontSize: 11, fontWeight: '700' },
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
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'square.grid.2x2.fill' : 'square.grid.2x2'} size={24} color={color} />
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
