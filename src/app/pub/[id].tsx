import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Avatar,
  Body,
  Button,
  Card,
  Display,
  EmptyState,
  Icon,
  Rating,
  SectionTitle,
  Stars,
} from '@/components/ui';
import { useSession } from '@/lib/auth';
import { photoUrl } from '@/lib/checkins';
import { formatDistance, formatWhen, plural } from '@/lib/format';
import {
  useMyTagVotes,
  usePub,
  usePubTagStats,
  usePubTags,
  usePubVisits,
  useReportPub,
  useVoteTag,
  type CorrectionType,
} from '@/lib/pubs';
import { colors } from '@/theme';

const CORRECTIONS: { label: string; type: CorrectionType }[] = [
  { label: 'It has closed down', type: 'closed' },
  { label: 'The pin is in the wrong place', type: 'wrong_location' },
  { label: 'The name is wrong', type: 'wrong_name' },
  { label: 'It is a duplicate', type: 'duplicate' },
];

export default function PubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const me = session?.user.id;

  const pub = usePub(id);
  const visits = usePubVisits(id);
  const tags = usePubTags();
  const tagStats = usePubTagStats(id);
  const myVotes = useMyTagVotes(id);
  const vote = useVoteTag(id);
  const report = useReportPub(id);

  const reportProblem = () => {
    const submit = (type: CorrectionType) =>
      report.mutate(
        { type },
        {
          onSuccess: () => Alert.alert('Thanks', 'We will take a look.'),
          onError: (error) => Alert.alert('Could not send that', error.message),
        }
      );

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Report a problem',
          options: ['Cancel', ...CORRECTIONS.map((c) => c.label)],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index > 0) submit(CORRECTIONS[index - 1].type);
        }
      );
    } else {
      Alert.alert('Report a problem', undefined, [
        ...CORRECTIONS.map((c) => ({ text: c.label, onPress: () => submit(c.type) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  if (pub.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }
  if (!pub.data) {
    return <EmptyState icon="mappin.slash" title="That pub is not here any more" />;
  }

  const { pub: details, stats } = pub.data;
  const mates = new Set(visits.data?.filter((v) => v.user_id !== me).map((v) => v.user_id));
  const been = visits.data?.some((v) => v.user_id === me) ?? false;

  const netFor = (slug: string) => tagStats.data?.find((t) => t.tag === slug)?.net_votes ?? 0;
  const myVoteFor = (slug: string) => myVotes.data?.find((v) => v.tag === slug)?.value ?? 0;

  const castVote = (slug: string, value: 1 | -1) => {
    void Haptics.selectionAsync();
    vote.mutate({ tag: slug, value: myVoteFor(slug) === value ? 0 : value });
  };

  const sortedTags = [...(tags.data ?? [])].sort((a, b) => netFor(b.slug) - netFor(a.slug));

  return (
    <>
      <Stack.Screen
        options={{
          title: details.name,
          headerRight: () => (
            <Pressable
              onPress={reportProblem}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Report a problem">
              <Icon name="ellipsis.circle" size={22} color={colors.ale} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-10 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={visits.isRefetching}
            onRefresh={() => {
              void pub.refetch();
              void visits.refetch();
              void tagStats.refetch();
            }}
          />
        }>
        <View className="gap-1">
          <Text className="text-ink font-display text-[32px] leading-10">{details.name}</Text>
          <Body>{[details.address, details.borough].filter(Boolean).join(' · ') || 'London'}</Body>
          <View className="mt-1">
            <Rating value={stats?.avg_rating} count={stats?.rating_count || null} size={16} />
          </View>
          {been ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <Icon name="checkmark.circle.fill" size={16} color={colors.you} />
              <Text className="text-ink text-[15px] font-semibold">You have been here</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-5 rounded-lg border border-line bg-surface px-5 py-4">
          <View className="items-center gap-1">
            <Display size={46}>{stats?.avg_rating != null ? Number(stats.avg_rating).toFixed(1) : '–'}</Display>
            <Stars value={stats?.avg_rating} size={11} />
          </View>
          <View className="h-12 w-px bg-line" />
          <View className="flex-1 gap-1.5">
            <Fact icon="mappin.and.ellipse" text={stats?.checkin_count ? plural(stats.checkin_count, 'visit') : 'No visits yet'} />
            <Fact icon="person.2.fill" text={mates.size ? `${plural(mates.size, 'mate')} been` : 'None of your mates yet'} />
            <Fact icon="star.fill" text={stats?.rating_count ? `${plural(stats.rating_count, 'rating')}` : 'Not rated yet'} />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label="Check in"
              icon="mappin.and.ellipse"
              onPress={() => router.push({ pathname: '/checkin/[pubId]', params: { pubId: details.id } })}
            />
          </View>
          {been ? (
            <View className="flex-1">
              <Button label="Been again" icon="arrow.counterclockwise" variant="outline" onPress={() => router.push({ pathname: '/checkin/[pubId]', params: { pubId: details.id } })} />
            </View>
          ) : null}
        </View>

        <View>
          <SectionTitle>What it is like</SectionTitle>
          <Card>
            {sortedTags.map((tag, index) => {
              const net = netFor(tag.slug);
              const mine = myVoteFor(tag.slug);
              return (
                <View
                  key={tag.slug}
                  className={`flex-row items-center gap-3 py-2 pl-4 pr-2 ${
                    index === sortedTags.length - 1 ? '' : 'border-b border-line'
                  }`}>
                  <Text className="text-ink flex-1 text-[17px]">{tag.label}</Text>
                  <Text
                    className={`w-8 text-right text-[15px] font-semibold ${
                      net > 0 ? 'text-mates' : net < 0 ? 'text-danger' : 'text-slate'
                    }`}>
                    {net > 0 ? `+${net}` : net}
                  </Text>
                  <VoteButton
                    icon={mine === 1 ? 'hand.thumbsup.fill' : 'hand.thumbsup'}
                    active={mine === 1}
                    label={`Yes, ${tag.label.toLowerCase()}`}
                    onPress={() => castVote(tag.slug, 1)}
                  />
                  <VoteButton
                    icon={mine === -1 ? 'hand.thumbsdown.fill' : 'hand.thumbsdown'}
                    active={mine === -1}
                    label={`No, not ${tag.label.toLowerCase()}`}
                    onPress={() => castVote(tag.slug, -1)}
                  />
                </View>
              );
            })}
          </Card>
        </View>

        <View>
          <SectionTitle>Visits</SectionTitle>
          {visits.data && visits.data.length === 0 ? (
            <Card>
              <EmptyState
                icon="person.2"
                title="None of your mates have been"
                body="Be the first. Check in and it turns gold on the map."
              />
            </Card>
          ) : null}
          <View className="gap-3">
            {visits.data?.map((visit) => {
              const who = visit.profiles;
              const isMe = visit.user_id === me;
              return (
                <Card key={visit.id}>
                  <View className="gap-2 p-4">
                    <Pressable
                      className="flex-row items-center gap-3"
                      disabled={isMe || !who}
                      onPress={() =>
                        who && router.push({ pathname: '/user/[id]', params: { id: who.id } })
                      }>
                      <Avatar url={who?.avatar_url} name={who?.display_name ?? '?'} size={36} />
                      <View className="flex-1">
                        <Text className="text-ink text-[17px] font-semibold">
                          {isMe ? 'You' : (who?.display_name ?? 'Someone')}
                        </Text>
                        <Text className="text-ink-soft text-sm">
                          {formatWhen(visit.created_at)}
                          {!visit.verified && visit.distance_m != null
                            ? ` · logged ${formatDistance(visit.distance_m)} away`
                            : ''}
                        </Text>
                      </View>
                      {visit.rating ? <Stars value={visit.rating} size={13} /> : null}
                    </Pressable>
                    {visit.note ? <Body>{visit.note}</Body> : null}
                    {visit.checkin_photos.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2 pt-1">
                          {visit.checkin_photos.map((photo) => (
                            <Image
                              key={photo.id}
                              source={{ uri: photoUrl(photo.storage_path) }}
                              style={{ width: 120, height: 120, borderRadius: 8 }}
                              contentFit="cover"
                              transition={150}
                            />
                          ))}
                        </View>
                      </ScrollView>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function Fact({ icon, text }: { icon: 'mappin.and.ellipse' | 'person.2.fill' | 'star.fill'; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name={icon} size={13} color={colors.inkSoft} />
      <Text className="text-ink text-[15px]">{text}</Text>
    </View>
  );
}

function VoteButton({
  icon,
  active,
  label,
  onPress,
}: {
  icon: 'hand.thumbsup' | 'hand.thumbsup.fill' | 'hand.thumbsdown' | 'hand.thumbsdown.fill';
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`h-11 w-11 items-center justify-center rounded-full ${
        active ? 'bg-ale-tint' : 'active:bg-ale-tint'
      }`}>
      <Icon name={icon} size={20} color={active ? colors.ale : colors.inkSoft} />
    </Pressable>
  );
}
