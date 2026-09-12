import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const WEEKLY_ID = 'weekly-summary';
const ASKED_KEY = 'pubd.weekly-nudge-asked';

// Show a notification even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * A local notification every Sunday at 6pm, scheduled on the device. No
 * server, no push credentials, works in Expo Go. When there is a real push
 * path this becomes a server job that knows what actually happened this week.
 *
 * Asked once, after the first check-in, which is the moment it makes sense.
 */
export async function offerWeeklyNudge(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
  } catch {
    return;
  }

  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((n) => n.identifier === WEEKLY_ID)) return;

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: {
      title: 'Your week in pubs',
      body: 'Who went where, and what was new.',
      data: { url: '/feed' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 18,
      minute: 0,
    },
  });
}
