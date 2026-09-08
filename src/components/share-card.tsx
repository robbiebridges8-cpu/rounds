import * as Sharing from 'expo-sharing';
import { forwardRef, type RefObject } from 'react';
import { Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { BOROUGH_TOTAL, BoroughMap } from '@/components/borough-map';
import { colors, fonts } from '@/theme';

export const CARD_SIZE = 1080;

type Props = {
  displayName: string;
  username: string;
  visited: ReadonlySet<string>;
  pubCount: number;
  inviteCode: string | null;
};

/**
 * The square image people post. Rendered off-screen at 1080x1080 and captured
 * with view-shot. Everything here is plain View and Text so it captures
 * pixel-perfectly; no NativeWind classes, because the card is not laid out by
 * the screen it lives on.
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { displayName, username, visited, pubCount, inviteCode },
  ref
) {
  const boroughs = visited.size;
  const possessive = displayName.endsWith('s') ? `${displayName}'` : `${displayName}'s`;

  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -CARD_SIZE * 2,
        top: 0,
        width: CARD_SIZE,
        height: CARD_SIZE,
        backgroundColor: colors.cream,
        padding: 72,
        justifyContent: 'space-between',
      }}>
      <View>
        <Text style={{ color: colors.ale, fontSize: 44, fontFamily: fonts.displayBlack }}>Rounds</Text>
        <Text
          style={{
            color: colors.ink,
            fontSize: 84,
            lineHeight: 92,
            fontFamily: fonts.displayBlack,
            marginTop: 20,
          }}>
          {possessive} London
        </Text>
        <Text style={{ color: colors.inkSoft, fontSize: 34, marginTop: 8, fontWeight: '500' }}>
          {boroughs} of {BOROUGH_TOTAL} boroughs · {pubCount} {pubCount === 1 ? 'pub' : 'pubs'}
        </Text>
      </View>

      <View style={{ alignItems: 'center' }}>
        <BoroughMap visited={visited} width={CARD_SIZE - 144} stroke={colors.cream} empty="#EFE4D2" />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ color: colors.inkSoft, fontSize: 30, fontWeight: '600' }}>@{username}</Text>
        {inviteCode ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.inkSoft, fontSize: 24, fontWeight: '500' }}>
              Join me with code
            </Text>
            <Text style={{ color: colors.ale, fontSize: 44, fontFamily: fonts.displayBlack, letterSpacing: 2 }}>
              {inviteCode}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export async function shareCard(ref: RefObject<View | null>) {
  if (!ref.current) return;
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}
