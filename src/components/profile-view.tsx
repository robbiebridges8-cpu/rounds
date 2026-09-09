import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOROUGH_TOTAL, BoroughMap } from '@/components/borough-map';
import { BadgeRow } from '@/components/challenge-card';
import { Diary } from '@/components/diary';
import { ShareCard, shareCard } from '@/components/share-card';
import { Avatar, Button, Card, EmptyState, Icon, ListRow, SectionTitle, Stars } from '@/components/ui';
import { WeeklyBars } from '@/components/weekly-bars';
import type { Profile } from '@/lib/auth';
import { useBadges } from '@/lib/challenges';
import { photoUrl, useUserCheckins, useUserPubs, useUserStats } from '@/lib/checkins';
import { plural } from '@/lib/format';
import { shareInvite, useInviteCode } from '@/lib/invites';
import { useMyMonth } from '@/lib/social';
import { colors, fonts } from '@/theme';

type Tab = 'overview' | 'pubs' | 'diary';

const possessive = (name: string) => (name.endsWith('s') ? `${name}'` : `${name}'s`);

/**
 * The poster. A cobalt hero with the fill-in map edge to edge and your name
 * on it, then a stats strip, tabs and the rest. The screenshot people post
 * is the screen itself. Everything is gated by RLS: for someone who is not
 * your friend the lists simply come back empty.
 */
export function ProfileView({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const stats = useUserStats(profile.id);
  const pubs = useUserPubs(profile.id);
  const checkins = useUserCheckins(profile.id);
  const badges = useBadges(profile.id);
  const inviteCode = useInviteCode();
  const month = useMyMonth();
  const cardRef = useRef<View>(null);
  const monthRef = useRef<View>(null);
  const [sharing, setSharing] = useState<'map' | 'month' | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const visited = new Set((pubs.data ?? []).map((p) => p.borough).filter((b): b is string => Boolean(b)));

  const refresh = () => {
    void stats.refetch();
    void pubs.refetch();
    void checkins.refetch();
    void badges.refetch();
  };

  const share = async (which: 'map' | 'month') => {
    setSharing(which);
    try {
      await shareCard(which === 'map' ? cardRef : monthRef);
    } catch (error) {
      Alert.alert('Could not share', error instanceof Error ? error.message : String(error));
    } finally {
      setSharing(null);
    }
  };

  const photoFor = new Map<string, string>();
  for (const c of checkins.data ?? []) {
    if (c.checkin_photos[0] && !photoFor.has(c.pub_id)) photoFor.set(c.pub_id, c.checkin_photos[0].storage_path);
  }
  const favourites = [...(pubs.data ?? [])]
    .filter((p) => p.latest_rating != null)
    .sort((a, b) => Number(b.latest_rating) - Number(a.latest_rating) || b.visits - a.visits)
    .slice(0, 4);

  const inner = width - 32;
  const heroHeight = Math.round(width * 1.2);
  const tagline =
    visited.size === 0 ? 'Nothing yellow yet' : visited.size < 10 ? 'Just getting going' : visited.size < 20 ? 'Proper Londoner' : visited.size < BOROUGH_TOTAL ? 'Frighteningly thorough' : 'The whole city';

  return (
    <>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={stats.isRefetching || pubs.isRefetching} onRefresh={refresh} tintColor="#fff" />}>
        {/* The poster */}
        <View style={{ height: heroHeight, backgroundColor: colors.you, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: -width * 0.08, top: insets.top + 92 }}>
            <BoroughMap visited={visited} width={width * 1.16} stroke={colors.you} empty="#1A36D6" friends={new Set()} />
          </View>
          <View style={{ position: 'absolute', left: 20, top: insets.top + 56, gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 2, color: colors.butter }}>
              @{profile.username.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1.2, color: '#fff' }} numberOfLines={2}>
              {possessive(profile.display_name)} London
            </Text>
          </View>
          <View style={{ position: 'absolute', right: 16, top: insets.top + 56 }}>
            <View style={{ padding: 3, borderRadius: 30, backgroundColor: '#fff' }}>
              <Avatar url={profile.avatar_url} name={profile.display_name} size={46} />
            </View>
          </View>
          <View style={{ position: 'absolute', left: 20, bottom: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 66, letterSpacing: -3, color: colors.butter }}>{visited.size}</Text>
            <View style={{ paddingBottom: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>of {BOROUGH_TOTAL} boroughs</Text>
              <Text style={{ color: '#fff', fontSize: 12, opacity: 0.8 }}>{tagline}</Text>
            </View>
          </View>
        </View>

        <View className="gap-4 px-4 pt-4">
          <View className="flex-row overflow-hidden rounded-lg bg-surface">
            <StatCell value={stats.data?.pub_count ?? 0} label="Pubs" />
            <StatCell value={stats.data?.checkin_count ?? 0} label="Check-ins" />
            <StatCell value={stats.data?.avg_rating != null ? Number(stats.data.avg_rating).toFixed(1) : '–'} label="Avg" />
            <StatCell value={badges.data?.length ?? 0} label="Badges" last />
          </View>

          <View className="flex-row gap-2">
            {([['overview', 'Overview'], ['pubs', 'Pubs'], ['diary', 'Diary']] as [Tab, string][]).map(([key, label]) => {
              const on = tab === key;
              return (
                <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} className={`h-10 flex-1 items-center justify-center rounded-full ${on ? 'bg-ink' : 'bg-surface'}`}>
                  <Text className={`text-[14px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {isMe ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Share this" icon="square.and.arrow.up" onPress={() => void share('map')} loading={sharing === 'map'} />
              </View>
              <View className="flex-1">
                <Button label="Invite a mate" icon="person.badge.plus" variant="accent" onPress={() => inviteCode.data && void shareInvite(inviteCode.data, profile.display_name)} disabled={!inviteCode.data} />
              </View>
            </View>
          ) : null}

          {tab === 'overview' ? (
            <>
              {favourites.length > 0 ? (
                <View>
                  <SectionTitle>Favourites</SectionTitle>
                  <View className="flex-row gap-2">
                    {favourites.map((p, index) => {
                      const tile = (inner - 6 * 3) / 4;
                      const photo = photoFor.get(p.pub_id);
                      return (
                        <Pressable key={p.pub_id} onPress={() => router.push({ pathname: '/pub/[id]', params: { id: p.pub_id } })} accessibilityRole="button" className="overflow-hidden rounded-md bg-raised" style={{ width: tile, height: tile * 1.3 }}>
                          {photo ? (
                            <Image source={{ uri: photoUrl(photo) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          ) : (
                            <View className="flex-1 items-center justify-center px-2">
                              <Text style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: colors.ink, textAlign: 'center' }} numberOfLines={4}>{p.name}</Text>
                            </View>
                          )}
                          <View className="absolute left-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full bg-surface">
                            <Text className="text-ink text-[11px] font-bold">{index + 1}</Text>
                          </View>
                          <View className="absolute bottom-1.5 left-1.5 rounded-full bg-surface px-1.5 py-0.5">
                            <Stars value={p.latest_rating} size={9} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {checkins.data ? <WeeklyBars dates={checkins.data.map((c) => c.created_at)} width={inner - 32} /> : null}

              {isMe && month.data && month.data.checkin_count > 0 ? (
                <Pressable onPress={() => void share('month')} accessibilityRole="button" className="flex-row items-center gap-3 rounded-lg bg-stout px-4 py-4 active:opacity-90">
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.butter }}>Last month</Text>
                    <Text className="text-white" style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.4 }}>
                      {month.data.checkin_count} check-ins, {month.data.new_pub_count} new pubs
                    </Text>
                    <Text className="text-[13px] text-white" style={{ opacity: 0.85 }}>Share the recap</Text>
                  </View>
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                    <Icon name="square.and.arrow.up" size={16} color="#101014" weight="bold" />
                  </View>
                </Pressable>
              ) : null}

              {badges.data && badges.data.length > 0 ? (
                <View>
                  <SectionTitle>Trophy case</SectionTitle>
                  <BadgeRow badges={badges.data} />
                </View>
              ) : null}

              {pubs.isSuccess && pubs.data.length === 0 ? (
                <Card>
                  <EmptyState icon="map" title={isMe ? 'No pubs yet' : `${profile.display_name} has not checked in yet`} body={isMe ? 'Your first check-in turns a borough yellow.' : undefined} />
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === 'pubs' ? (
            pubs.data && pubs.data.length > 0 ? (
              <Card>
                {[...pubs.data]
                  .sort((a, b) => Number(b.latest_rating ?? 0) - Number(a.latest_rating ?? 0) || b.last_visit.localeCompare(a.last_visit))
                  .map((pub, index, all) => (
                    <ListRow key={pub.pub_id} title={pub.name} subtitle={[pub.borough, plural(pub.visits, 'visit')].filter(Boolean).join(' · ')} right={pub.latest_rating != null ? <Stars value={pub.latest_rating} size={13} /> : undefined} onPress={() => router.push({ pathname: '/pub/[id]', params: { id: pub.pub_id } })} last={index === all.length - 1} />
                  ))}
              </Card>
            ) : (
              <Card>
                <EmptyState icon="list.star" title="No pubs yet" body={isMe ? 'Every pub you check in at lands here, best first.' : undefined} />
              </Card>
            )
          ) : null}

          {tab === 'diary' ? <Diary checkins={checkins.data ?? []} me={isMe} /> : null}
        </View>
      </ScrollView>

      {isMe ? (
        <>
          <ShareCard ref={cardRef} displayName={profile.display_name} username={profile.username} visited={visited} pubCount={stats.data?.pub_count ?? 0} inviteCode={inviteCode.data ?? null} />
          {month.data ? <ShareCard ref={monthRef} displayName={profile.display_name} username={profile.username} visited={visited} pubCount={stats.data?.pub_count ?? 0} inviteCode={inviteCode.data ?? null} month={month.data} /> : null}
        </>
      ) : null}
    </>
  );
}

function StatCell({ value, label, last }: { value: number | string; label: string; last?: boolean }) {
  return (
    <View className={`flex-1 items-center py-3 ${last ? '' : 'border-r border-line'}`}>
      <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text className="text-ink-soft text-[10px] font-bold uppercase tracking-wider">{label}</Text>
    </View>
  );
}
