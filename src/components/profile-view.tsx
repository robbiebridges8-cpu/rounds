import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { BOROUGH_TOTAL, BoroughMap } from '@/components/borough-map';
import { BadgeRow } from '@/components/challenge-card';
import { ShareCard, shareCard } from '@/components/share-card';
import { Avatar, Body, Button, Card, EmptyState, ListRow, SectionTitle, Stars, Stat } from '@/components/ui';
import type { Profile } from '@/lib/auth';
import { useBadges } from '@/lib/challenges';
import { photoUrl, useUserCheckins, useUserPubs, useUserStats } from '@/lib/checkins';
import { formatWhen, plural } from '@/lib/format';
import { shareInvite, useInviteCode } from '@/lib/invites';

/**
 * One profile layout for you and for a friend. Everything here is gated by
 * RLS: for someone who is not your friend the lists simply come back empty.
 */
export function ProfileView({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const stats = useUserStats(profile.id);
  const pubs = useUserPubs(profile.id);
  const checkins = useUserCheckins(profile.id);
  const inviteCode = useInviteCode();
  const badges = useBadges(profile.id);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const visited = new Set(
    (pubs.data ?? []).map((p) => p.borough).filter((b): b is string => Boolean(b))
  );

  const refreshing = stats.isRefetching || pubs.isRefetching;
  const refresh = () => {
    void stats.refetch();
    void pubs.refetch();
    void checkins.refetch();
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

  const invite = () => {
    if (!inviteCode.data) return;
    void shareInvite(inviteCode.data, profile.display_name);
  };

  const mapWidth = width - 32;

  return (
    <>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View className="flex-row items-center gap-4">
          <Avatar url={profile.avatar_url} name={profile.display_name} size={64} />
          <View className="flex-1">
            <Text className="text-ink font-display text-[26px] leading-8" numberOfLines={1}>
              {profile.display_name}
            </Text>
            <Text className="text-ink-soft text-[15px]">@{profile.username}</Text>
          </View>
        </View>

        <View className="gap-2">
          <BoroughMap visited={visited} width={mapWidth} />
          <View className="flex-row items-baseline justify-between px-1">
            <Text className="text-ink font-display text-[20px]">
              {visited.size} of {BOROUGH_TOTAL} boroughs
            </Text>
            <Text className="text-ink-soft text-[13px]">
              {visited.size === 0
                ? 'Nothing gold yet'
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

        <View className="flex-row gap-3">
          <Stat value={stats.data?.pub_count ?? 0} label="Pubs" />
          <Stat value={stats.data?.checkin_count ?? 0} label="Check-ins" />
          <Stat value={stats.data?.avg_rating != null ? Number(stats.data.avg_rating).toFixed(1) : '–'} label="Avg rating" />
        </View>

        {isMe ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Share my map" icon="square.and.arrow.up" onPress={() => void share()} loading={sharing} />
            </View>
            <View className="flex-1">
              <Button
                label="Invite a mate"
                icon="person.badge.plus"
                variant="quiet"
                onPress={invite}
                disabled={!inviteCode.data}
              />
            </View>
          </View>
        ) : null}

        {badges.data && badges.data.length > 0 ? (
          <View>
            <SectionTitle>Badges</SectionTitle>
            <BadgeRow badges={badges.data} />
          </View>
        ) : null}

        {pubs.isSuccess && pubs.data.length === 0 ? (
          <Card>
            <EmptyState
              icon="map"
              title={isMe ? 'No pubs yet' : `${profile.display_name} has not checked in yet`}
              body={isMe ? 'Your first check-in turns a borough gold.' : undefined}
            />
          </Card>
        ) : null}

        {pubs.data && pubs.data.length > 0 ? (
          <View>
            <SectionTitle>Pubs</SectionTitle>
            <Card>
              {pubs.data.map((pub, index) => (
                <ListRow
                  key={pub.pub_id}
                  title={pub.name}
                  subtitle={[pub.borough, plural(pub.visits, 'visit')].filter(Boolean).join(' · ')}
                  right={<Stars value={pub.latest_rating} size={14} />}
                  onPress={() => router.push({ pathname: '/pub/[id]', params: { id: pub.pub_id } })}
                  last={index === pubs.data.length - 1}
                />
              ))}
            </Card>
          </View>
        ) : null}

        {checkins.data && checkins.data.some((c) => c.note || c.checkin_photos.length > 0) ? (
          <View>
            <SectionTitle>Recent</SectionTitle>
            <View className="gap-3">
              {checkins.data
                .filter((c) => c.note || c.checkin_photos.length > 0)
                .slice(0, 10)
                .map((c) => (
                  <Card key={c.id}>
                    <View className="gap-2 p-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-ink text-[17px] font-semibold" numberOfLines={1}>
                          {c.pubs?.name ?? 'A pub'}
                        </Text>
                        <Text className="text-ink-soft text-sm">{formatWhen(c.created_at)}</Text>
                      </View>
                      {c.rating ? <Stars value={c.rating} size={14} /> : null}
                      {c.note ? <Body>{c.note}</Body> : null}
                      {c.checkin_photos.length > 0 ? (
                        <View className="flex-row gap-2 pt-1">
                          {c.checkin_photos.map((photo) => (
                            <Image
                              key={photo.id}
                              source={{ uri: photoUrl(photo.storage_path) }}
                              style={{ width: 88, height: 88, borderRadius: 10 }}
                              contentFit="cover"
                              transition={150}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </Card>
                ))}
            </View>
          </View>
        ) : null}
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
