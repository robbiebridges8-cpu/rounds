import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { BOROUGH_TOTAL, BoroughMap } from '@/components/borough-map';
import { BadgeRow } from '@/components/challenge-card';
import { Diary } from '@/components/diary';
import { ShareCard, shareCard } from '@/components/share-card';
import { Avatar, Button, Card, EmptyState, ListRow, SectionTitle, Stars } from '@/components/ui';
import { WeeklyBars } from '@/components/weekly-bars';
import type { Profile } from '@/lib/auth';
import { useBadges } from '@/lib/challenges';
import { photoUrl, useUserCheckins, useUserPubs, useUserStats } from '@/lib/checkins';
import { plural } from '@/lib/format';
import { shareInvite, useInviteCode } from '@/lib/invites';
import { colors, fonts } from '@/theme';

type Tab = 'overview' | 'pubs' | 'diary';

/**
 * One profile layout for you and for a friend. A header, a stats bar, then
 * tabs. Everything here is gated by RLS: for someone who is not your friend
 * the lists simply come back empty.
 */
export function ProfileView({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const stats = useUserStats(profile.id);
  const pubs = useUserPubs(profile.id);
  const checkins = useUserCheckins(profile.id);
  const badges = useBadges(profile.id);
  const inviteCode = useInviteCode();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const visited = new Set((pubs.data ?? []).map((p) => p.borough).filter((b): b is string => Boolean(b)));

  const refresh = () => {
    void stats.refetch();
    void pubs.refetch();
    void checkins.refetch();
    void badges.refetch();
  };

  const share = async () => {
    setSharing(true);
    try {
      await shareCard(cardRef);
    } catch (error) {
      Alert.alert('Could not share', error instanceof Error ? error.message : String(error));
    } finally {
      setSharing(false);
    }
  };

  const photoFor = new Map<string, string>();
  for (const c of checkins.data ?? []) {
    if (c.checkin_photos[0] && !photoFor.has(c.pub_id)) photoFor.set(c.pub_id, c.checkin_photos[0].storage_path);
  }

  // Four favourites: highest rated, ties broken by most visits.
  const favourites = [...(pubs.data ?? [])]
    .filter((p) => p.latest_rating != null)
    .sort((a, b) => Number(b.latest_rating) - Number(a.latest_rating) || b.visits - a.visits)
    .slice(0, 4);
  const inner = width - 32;

  return (
    <>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={stats.isRefetching || pubs.isRefetching} onRefresh={refresh} />}>
        <View className="flex-row items-center gap-4">
          <Avatar url={profile.avatar_url} name={profile.display_name} size={64} />
          <View className="flex-1">
            <Text className="text-ink font-display text-[28px] leading-8" style={{ letterSpacing: -0.6 }} numberOfLines={1}>
              {profile.display_name}
            </Text>
            <Text className="text-ink-soft text-[15px]">@{profile.username}</Text>
          </View>
        </View>

        <View className="flex-row rounded-lg bg-surface">
          <StatCell value={stats.data?.pub_count ?? 0} label="Pubs" />
          <StatCell value={visited.size} label="Boroughs" />
          <StatCell value={stats.data?.checkin_count ?? 0} label="Check-ins" />
          <StatCell value={badges.data?.length ?? 0} label="Badges" last />
        </View>

        <View className="flex-row gap-2">
          {([['overview', 'Overview'], ['pubs', 'Pubs'], ['diary', 'Diary']] as [Tab, string][]).map(([key, label]) => {
            const on = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className={`h-10 flex-1 items-center justify-center rounded-full ${on ? 'bg-ink' : 'bg-surface'}`}>
                <Text className={`text-[14px] font-bold ${on ? 'text-canvas' : 'text-ink'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

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
                      <Pressable
                        key={p.pub_id}
                        onPress={() => router.push({ pathname: '/pub/[id]', params: { id: p.pub_id } })}
                        accessibilityRole="button"
                        className="overflow-hidden rounded-md bg-raised"
                        style={{ width: tile, height: tile * 1.3 }}>
                        {photo ? (
                          <Image source={{ uri: photoUrl(photo) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center px-2">
                            <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: colors.ink, textAlign: 'center' }} numberOfLines={4}>
                              {p.name}
                            </Text>
                          </View>
                        )}
                        <View className="absolute left-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full bg-surface">
                          <Text className="text-ink text-[11px] font-bold">{index + 1}</Text>
                        </View>
                        <View className="absolute bottom-1.5 left-1.5 flex-row items-center gap-0.5 rounded-full bg-surface px-1.5 py-0.5">
                          <Stars value={p.latest_rating} size={9} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View className="gap-2 rounded-lg bg-surface p-3">
              <BoroughMap visited={visited} width={inner - 24} stroke={colors.surface} />
              <View className="flex-row items-baseline justify-between px-1">
                <Text className="text-ink font-display text-[20px]">
                  {visited.size} of {BOROUGH_TOTAL} boroughs
                </Text>
                <Text className="text-ink-soft text-[13px]">
                  {visited.size === 0
                    ? 'Nothing yellow yet'
                    : visited.size < 10
                      ? 'Just getting going'
                      : visited.size < 20
                        ? 'Proper Londoner'
                        : visited.size < BOROUGH_TOTAL
                          ? 'Frighteningly thorough'
                          : 'The whole city'}
                </Text>
              </View>
            </View>

            {checkins.data ? <WeeklyBars dates={checkins.data.map((c) => c.created_at)} width={inner - 32} /> : null}

            {isMe ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button label="Share my map" icon="square.and.arrow.up" onPress={() => void share()} loading={sharing} />
                </View>
                <View className="flex-1">
                  <Button
                    label="Invite a mate"
                    icon="person.badge.plus"
                    variant="outline"
                    onPress={() => inviteCode.data && void shareInvite(inviteCode.data, profile.display_name)}
                    disabled={!inviteCode.data}
                  />
                </View>
              </View>
            ) : null}

            {badges.data && badges.data.length > 0 ? (
              <View>
                <SectionTitle>Trophy case</SectionTitle>
                <BadgeRow badges={badges.data} />
              </View>
            ) : null}

            {pubs.isSuccess && pubs.data.length === 0 ? (
              <Card>
                <EmptyState
                  icon="map"
                  title={isMe ? 'No pubs yet' : `${profile.display_name} has not checked in yet`}
                  body={isMe ? 'Your first check-in turns a borough yellow.' : undefined}
                />
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
                  <ListRow
                    key={pub.pub_id}
                    title={pub.name}
                    subtitle={[pub.borough, plural(pub.visits, 'visit')].filter(Boolean).join(' · ')}
                    right={pub.latest_rating != null ? <Stars value={pub.latest_rating} size={13} /> : undefined}
                    onPress={() => router.push({ pathname: '/pub/[id]', params: { id: pub.pub_id } })}
                    last={index === all.length - 1}
                  />
                ))}
            </Card>
          ) : (
            <Card>
              <EmptyState icon="list.star" title="No pubs yet" body={isMe ? 'Every pub you check in at lands here, best first.' : undefined} />
            </Card>
          )
        ) : null}

        {tab === 'diary' ? <Diary checkins={checkins.data ?? []} me={isMe} /> : null}
      </ScrollView>

      {isMe ? (
        <ShareCard
          ref={cardRef}
          displayName={profile.display_name}
          username={profile.username}
          visited={visited}
          pubCount={stats.data?.pub_count ?? 0}
          inviteCode={inviteCode.data ?? null}
        />
      ) : null}
    </>
  );
}

function StatCell({ value, label, last }: { value: number | string; label: string; last?: boolean }) {
  return (
    <View className={`flex-1 items-center py-3 ${last ? '' : 'border-r border-line'}`}>
      <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className="text-ink-soft text-[10px] font-bold uppercase tracking-wide">{label}</Text>
    </View>
  );
}
