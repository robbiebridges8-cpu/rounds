import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LeaderboardRow } from '@/lib/social';

const KEY = 'rounds.leaderboard-snapshot';

type Snapshot = Record<string, number>; // user id -> borough count

export type Overtake = { userId: string; name: string; theirs: number; mine: number };

/**
 * "Tom overtook you." Computed on the device by comparing the leaderboard
 * with the last one you saw. No server, no history table, and it only ever
 * fires for something that happened while you were away, which is exactly
 * when it stings.
 */
export async function detectOvertakes(rows: LeaderboardRow[]): Promise<Overtake[]> {
  const me = rows.find((r) => r.is_me);
  if (!me) return [];

  let previous: Snapshot | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    previous = raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    previous = null;
  }

  const next: Snapshot = Object.fromEntries(rows.map((r) => [r.user_id, r.borough_count]));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // fine, we just will not detect the next one
  }

  if (!previous) return [];
  const myBefore = previous[me.user_id];
  if (myBefore == null) return [];

  return rows
    .filter((r) => !r.is_me)
    .filter((r) => {
      const before = previous![r.user_id];
      // They were at or below me last time, and are above me now.
      return before != null && before <= myBefore && r.borough_count > me.borough_count;
    })
    .map((r) => ({
      userId: r.user_id,
      name: r.display_name,
      theirs: r.borough_count,
      mine: me.borough_count,
    }));
}
