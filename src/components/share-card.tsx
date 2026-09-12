import * as Sharing from 'expo-sharing';
import { forwardRef, type RefObject } from 'react';
import { Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { BOROUGH_TOTAL, BoroughMap } from '@/components/borough-map';
import { Wordmark } from '@/components/ui';
import type { MyMonth } from '@/lib/social';
import { fonts, palettes } from '@/theme';

export const CARD_SIZE = 1080;

// The card is always the light Signal look, whatever the app is set to.
const P = palettes.light;

type Props = {
  displayName: string;
  username: string;
  visited: ReadonlySet<string>;
  pubCount: number;
  inviteCode: string | null;
  /** When set, the card is last month's recap instead of the map. */
  month?: MyMonth | null;
};

/**
 * The square image people post. Rendered off-screen at 1080x1080 and captured
 * with view-shot. Plain View and Text only, so it captures pixel-perfectly.
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard({ displayName, username, visited, pubCount, inviteCode, month }, ref) {
  const possessive = displayName.endsWith('s') ? `${displayName}'` : `${displayName}'s`;
  const monthName = month ? new Date(month.month_start).toLocaleDateString('en-GB', { month: 'long' }) : '';

  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      style={{ position: 'absolute', left: -CARD_SIZE * 2, top: 0, width: CARD_SIZE, height: CARD_SIZE, backgroundColor: P.surface, padding: 72, justifyContent: 'space-between' }}>
      <View style={{ position: 'absolute', right: -160, top: -160, width: 520, height: 520, borderRadius: 260, backgroundColor: P.butter }} />
      <View style={{ position: 'absolute', left: -120, bottom: 120, width: 360, height: 360, borderRadius: 180, backgroundColor: P.mint }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Wordmark size={24} color="#fff" />
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, color: P.ink, letterSpacing: -0.5 }}>@{username}</Text>
      </View>

      {month ? (
        <View style={{ gap: 28 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 92, lineHeight: 96, letterSpacing: -4, color: P.ink }}>
            {possessive}{'\n'}{monthName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Tile value={month.checkin_count} label="check-ins" bg={P.you} fg="#fff" />
            <Tile value={month.new_pub_count} label="new pubs" bg={P.butter} fg={P.ink} />
            <Tile value={month.new_borough_count} label="new boroughs" bg={P.ale} fg="#fff" />
          </View>
          {month.top_pub_name ? (
            <Text style={{ fontSize: 34, color: P.inkSoft, fontWeight: '600' }}>
              Most visited: <Text style={{ color: P.ink, fontWeight: '800' }}>{month.top_pub_name}</Text>
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 84, lineHeight: 90, letterSpacing: -4, color: P.ink }}>
            {possessive} London
          </Text>
          <View style={{ backgroundColor: P.canvas, borderRadius: 40, padding: 32, alignItems: 'center' }}>
            <BoroughMap visited={visited} width={CARD_SIZE - 144 - 64} stroke={P.canvas} empty={P.raised} />
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Tile value={`${visited.size}/${BOROUGH_TOTAL}`} label="boroughs" bg={P.you} fg="#fff" />
            <Tile value={pubCount} label="pubs" bg={P.butter} fg={P.ink} />
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 28, color: P.inkSoft, fontWeight: '700' }}>The pub map for you and your mates.</Text>
        {inviteCode ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 22, color: P.inkSoft, fontWeight: '600' }}>Join me with code</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 40, color: P.ink, letterSpacing: 2 }}>{inviteCode}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

function Tile({ value, label, bg, fg }: { value: number | string; label: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 32, padding: 28 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 70, color: fg }}>{value}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: fg, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</Text>
    </View>
  );
}

export async function shareCard(ref: RefObject<View | null>) {
  if (!ref.current) return;
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
}
