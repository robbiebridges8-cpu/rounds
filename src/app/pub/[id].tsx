import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoroughSnapshot } from '@/components/borough-map';
import { Avatar, Body, Button, Card, EmptyState, Icon, ListRow, SectionTitle, Stars } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { photoUrl } from '@/lib/checkins';
import { formatDistance, formatWhen, plural } from '@/lib/format';
import { useAddListPubs, useLists, usePubLists } from '@/lib/lists';
import { useMyTagVotes, usePub, usePubPhotos, usePubRatingHistogram, usePubTagStats, usePubTags, usePubVisits, useReportPub, useVoteTag, type CorrectionType } from '@/lib/pubs';
import { colors, fonts } from '@/theme';

const CORRECTIONS: { label: string; type: CorrectionType }[] = [
  { label: 'It has closed down', type: 'closed' },
  { label: 'The pin is in the wrong place', type: 'wrong_location' },
  { label: 'The name is wrong', type: 'wrong_name' },
  { label: 'It is a duplicate', type: 'duplicate' },
];

/**
 * The pub is a photo. Full-bleed at the top with the name on it and two
 * pills, a floating check-in, then everything else in a column.
 */
export default function PubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const me = session?.user.id;

  const pub = usePub(id);
  const photos = usePubPhotos(id);
  const visits = usePubVisits(id);
  const tags = usePubTags();
  const tagStats = usePubTagStats(id);
  const myVotes = useMyTagVotes(id);
  const vote = useVoteTag(id);
  const report = useReportPub(id);
  const onLists = usePubLists(id);
  const histogram = usePubRatingHistogram(id);
  const lists = useLists();
  const addToList = useAddListPubs();

  const reportProblem = () => {
    const submit = (type: CorrectionType) =>
      report.mutate({ type }, { onSuccess: () => Alert.alert('Thanks', 'We will take a look.'), onError: (error) => Alert.alert('Could not send that', error.message) });
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: 'Report a problem', options: ['Cancel', ...CORRECTIONS.map((c) => c.label)], cancelButtonIndex: 0 }, (index) => {
        if (index > 0) submit(CORRECTIONS[index - 1].type);
      });
    } else {
      Alert.alert('Report a problem', undefined, [...CORRECTIONS.map((c) => ({ text: c.label, onPress: () => submit(c.type) })), { text: 'Cancel', style: 'cancel' as const }]);
    }
  };

  const myLists = (lists.data ?? []).filter((l) => l.creator_id === me);
  const addToMyList = () => {
    if (myLists.length === 0) {
      router.push('/list/new');
      return;
    }
    const pick = (i: number) => addToList.mutate({ id: myLists[i].id, pubIds: [id] }, { onSuccess: () => Alert.alert('Added', `On ${myLists[i].title}.`) });
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: 'Add to a list', options: ['Cancel', ...myLists.map((l) => l.title)], cancelButtonIndex: 0 }, (index) => {
        if (index > 0) pick(index - 1);
      });
    } else {
      Alert.alert('Add to a list', undefined, [...myLists.map((l, i) => ({ text: l.title, onPress: () => pick(i) })), { text: 'Cancel', style: 'cancel' as const }]);
    }
  };

  if (pub.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }
  if (!pub.data) return <EmptyState icon="mappin.slash" title="That pub is not here any more" />;

  const { pub: details, stats } = pub.data;
  const mates = new Set(visits.data?.filter((v) => v.user_id !== me).map((v) => v.user_id));
  const been = visits.data?.some((v) => v.user_id === me) ?? false;
  const hero = photos.data?.[0];
  const heroHeight = Math.round(width * 0.85);

  const confirmedFor = (slug: string) => tagStats.data?.find((t) => t.tag === slug)?.up_votes ?? 0;
  const goneFor = (slug: string) => tagStats.data?.find((t) => t.tag === slug)?.down_votes ?? 0;
  const fromMap = (slug: string) => tagStats.data?.find((t) => t.tag === slug)?.osm ?? false;
  const myVoteFor = (slug: string) => myVotes.data?.find((v) => v.tag === slug)?.value ?? 0;
  const confirm = (slug: string) => {
    void Haptics.selectionAsync();
    vote.mutate({ tag: slug, value: myVoteFor(slug) === 1 ? 0 : 1 });
  };
  const notAnyMore = (slug: string, label: string) =>
    Alert.alert(`${label}: not any more?`, 'Say so if it has changed. Nobody will see who said it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Not any more', style: 'destructive', onPress: () => vote.mutate({ tag: slug, value: -1 }) },
    ]);
  const weight = (slug: string) => confirmedFor(slug) + (fromMap(slug) ? 1 : 0);
  const group = (g: string) => [...(tags.data ?? [])].filter((t) => t.group === g).sort((a, b) => weight(b.slug) - weight(a.slug) || a.sort_order - b.sort_order);
  const totalRatings = (histogram.data ?? []).reduce((a, h) => a + h.n, 0);
  const ratedVisits = (visits.data ?? []).filter((v) => v.rating != null);
  const quotes = (visits.data ?? []).filter((v) => v.note && v.note.trim().length > 0).slice(0, 3);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <Pressable onPress={reportProblem} hitSlop={8} accessibilityRole="button" accessibilityLabel="Report a problem">
              <Icon name="ellipsis.circle.fill" size={24} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={visits.isRefetching} tintColor="#fff" onRefresh={() => { void pub.refetch(); void visits.refetch(); void tagStats.refetch(); void photos.refetch(); }} />}>
        {/* Hero */}
        <View style={{ height: heroHeight, backgroundColor: colors.you, overflow: 'hidden' }}>
          {hero ? (
            <Image source={{ uri: photoUrl(hero) }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ position: 'absolute', right: -30, top: insets.top + 40, opacity: 0.9 }}>
              <BoroughSnapshot borough={details.borough} lat={details.lat} lng={details.lng} width={260} height={200} fill="#1A36D6" dot={colors.butter} />
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 70 }} />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 70, paddingBottom: 18, gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 2, color: colors.butter }}>
              {[details.borough, details.status === 'unverified' ? 'UNVERIFIED' : null].filter(Boolean).join(' · ').toUpperCase() || 'LONDON'}
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1.2, color: '#fff' }}>{details.name}</Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="h-[30px] flex-row items-center gap-1.5 rounded-full bg-white px-3">
                <Icon name="star.fill" size={12} color={colors.ale} />
                <Text className="text-[12px] font-bold" style={{ color: '#101014' }}>
                  {stats?.avg_rating != null ? `${Number(stats.avg_rating).toFixed(1)} · ${plural(stats.rating_count, 'rating')}` : 'Not rated yet'}
                </Text>
              </View>
              <View className="h-[30px] flex-row items-center rounded-full px-3" style={{ backgroundColor: been ? colors.you : mates.size ? colors.ale : 'rgba(255,255,255,0.2)' }}>
                <Text className="text-[12px] font-bold text-white">
                  {been && mates.size ? `You + ${plural(mates.size, 'mate')} been` : been ? 'You have been' : mates.size ? `${plural(mates.size, 'mate')} been` : 'Nobody you know yet'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View className="gap-5 px-4 pt-4">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Check in" icon="mappin.and.ellipse" onPress={() => router.push({ pathname: '/checkin/[pubId]', params: { pubId: details.id } })} />
            </View>
            <Button label="List" icon="bookmark" variant="outline" onPress={addToMyList} loading={addToList.isPending} />
          </View>

          {details.address ? <Body>{details.address}</Body> : null}

          {photos.data && photos.data.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="gap-2 px-4">
              {photos.data.slice(1).map((p) => (
                <Image key={p} source={{ uri: photoUrl(p) }} style={{ width: 120, height: 120, borderRadius: 14 }} contentFit="cover" transition={150} />
              ))}
            </ScrollView>
          ) : null}

          {totalRatings > 0 ? (
            <View>
              <SectionTitle>Ratings</SectionTitle>
              <Card>
                <View className="gap-3 p-4">
                  <View className="flex-row items-end gap-4">
                    <Text style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 52, letterSpacing: -2, color: colors.ink }}>{stats?.avg_rating != null ? Number(stats.avg_rating).toFixed(1) : '–'}</Text>
                    <View className="flex-1 gap-1 pb-2">
                      <Stars value={stats?.avg_rating} size={16} />
                      <Text className="text-ink-soft text-[13px] font-semibold">{plural(totalRatings, 'rating')}{ratedVisits.length ? ` · your mates say ${(ratedVisits.reduce((a, v) => a + Number(v.rating), 0) / ratedVisits.length).toFixed(1)}` : ''}</Text>
                    </View>
                  </View>
                  <View className="gap-1.5">
                    {(histogram.data ?? []).map((h) => (
                      <View key={h.star} className="flex-row items-center gap-2">
                        <Text className="text-ink-soft w-3 text-[11px] font-bold">{h.star}</Text>
                        <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                          <View className="h-full rounded-full" style={{ width: `${totalRatings ? (h.n / totalRatings) * 100 : 0}%`, backgroundColor: h.star >= 4 ? colors.ale : colors.slate }} />
                        </View>
                        <Text className="text-ink-soft w-7 text-right text-[11px]">{h.n}</Text>
                      </View>
                    ))}
                  </View>
                  {ratedVisits.length > 0 ? (
                    <View className="pt-1" style={{ height: 52 }}>
                      <View className="absolute left-0 right-0 rounded-full bg-line" style={{ top: 26, height: 3 }} />
                      {ratedVisits.map((v) => (
                        <View key={v.id} className="absolute items-center" style={{ left: `${(Number(v.rating) / 5) * 100}%`, transform: [{ translateX: -13 }] }}>
                          <View className="rounded-full border-2 border-surface">
                            <Avatar url={v.profiles?.avatar_url} name={v.profiles?.display_name ?? '?'} size={26} />
                          </View>
                          <Text className="text-ink text-[10px] font-bold">{Number(v.rating).toFixed(1)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </Card>
            </View>
          ) : null}

          {quotes.length > 0 ? (
            <View>
              <SectionTitle>What mates say</SectionTitle>
              <View className="gap-2">
                {quotes.map((v) => (
                  <Pressable key={v.id} onPress={() => router.push({ pathname: '/post/[id]', params: { id: v.id } })} className="rounded-lg bg-surface p-4 active:bg-raised">
                    <Text className="text-ink text-[17px] leading-6" style={{ fontStyle: 'italic' }}>&ldquo;{v.note}&rdquo;</Text>
                    <View className="mt-2 flex-row items-center gap-2">
                      <Avatar url={v.profiles?.avatar_url} name={v.profiles?.display_name ?? '?'} size={22} />
                      <Text className="text-ink-soft text-[13px] font-semibold">{v.user_id === me ? 'You' : (v.profiles?.display_name ?? 'Someone')} · {formatWhen(v.created_at)}</Text>
                      {v.rating ? <Stars value={v.rating} size={11} /> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <SectionTitle>It&apos;s got</SectionTitle>
            <TagChips items={group('has')} confirmedFor={confirmedFor} goneFor={goneFor} fromMap={fromMap} myVoteFor={myVoteFor} onConfirm={confirm} onGone={notAnyMore} />
          </View>
          <View>
            <SectionTitle>Good to know</SectionTitle>
            <TagChips items={group('know')} confirmedFor={confirmedFor} goneFor={goneFor} fromMap={fromMap} myVoteFor={myVoteFor} onConfirm={confirm} onGone={notAnyMore} />
          </View>

          {onLists.data && onLists.data.length > 0 ? (
            <View>
              <SectionTitle>On {onLists.data.length} {onLists.data.length === 1 ? 'list' : 'lists'}</SectionTitle>
              <Card>
                {onLists.data.map((l, index) => (
                  <ListRow key={l.id} title={l.title} subtitle={l.note ?? `by ${l.creator_name}${l.follower_count ? ` · ${l.follower_count} following` : ''}`} onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })} last={index === onLists.data.length - 1} />
                ))}
              </Card>
            </View>
          ) : null}

          <View>
            <SectionTitle>Visits</SectionTitle>
            {visits.data && visits.data.length === 0 ? (
              <Card>
                <EmptyState icon="person.2" title="None of your mates have been" body="Be the first. Check in and it turns blue on the map." />
              </Card>
            ) : null}
            <View className="gap-3">
              {visits.data?.map((visit) => {
                const who = visit.profiles;
                const isMe = visit.user_id === me;
                return (
                  <Card key={visit.id}>
                    <View className="gap-2 p-4">
                      <Pressable className="flex-row items-center gap-3" disabled={isMe || !who} onPress={() => who && router.push({ pathname: '/user/[id]', params: { id: who.id } })}>
                        <Avatar url={who?.avatar_url} name={who?.display_name ?? '?'} size={36} />
                        <View className="flex-1">
                          <Text className="text-ink text-[17px] font-bold">{isMe ? 'You' : (who?.display_name ?? 'Someone')}</Text>
                          <Text className="text-ink-soft text-sm">
                            {formatWhen(visit.created_at)}
                            {!visit.verified && visit.distance_m != null ? ` · logged ${formatDistance(visit.distance_m)} away` : ''}
                          </Text>
                        </View>
                        {visit.rating ? <Stars value={visit.rating} size={13} /> : null}
                      </Pressable>
                      {visit.note ? <Body>{visit.note}</Body> : null}
                      {visit.checkin_photos.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View className="flex-row gap-2 pt-1">
                            {visit.checkin_photos.map((photo) => (
                              <Image key={photo.id} source={{ uri: photoUrl(photo.storage_path) }} style={{ width: 120, height: 120, borderRadius: 12 }} contentFit="cover" transition={150} />
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
        </View>
      </ScrollView>
    </>
  );
}

type Tag = { slug: string; label: string };

/**
 * Tags as chips. Tap to confirm it is true; the count is how many people
 * have. Long press for "not any more". Nothing to vote against.
 */
function TagChips({ items, confirmedFor, goneFor, fromMap, myVoteFor, onConfirm, onGone }: {
  items: Tag[];
  confirmedFor: (slug: string) => number;
  goneFor: (slug: string) => number;
  fromMap: (slug: string) => boolean;
  myVoteFor: (slug: string) => number;
  onConfirm: (slug: string) => void;
  onGone: (slug: string, label: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((t) => {
        const n = confirmedFor(t.slug);
        const map = fromMap(t.slug);
        const known = n > 0 || map;
        const gone = goneFor(t.slug) > n + (map ? 1 : 0);
        const mine = myVoteFor(t.slug) === 1;
        return (
          <Pressable
            key={t.slug}
            onPress={() => onConfirm(t.slug)}
            onLongPress={() => onGone(t.slug, t.label)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: mine }}
            accessibilityLabel={`${t.label}${n ? `, confirmed by ${n}` : map ? ', from the map' : ''}`}
            className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-80"
            style={{ backgroundColor: mine ? colors.you : known ? colors.surface : colors.raised, opacity: gone ? 0.45 : 1 }}>
            {mine ? <Icon name="checkmark" size={11} color="#fff" weight="bold" /> : null}
            <Text className="text-[13px] font-bold" style={{ color: mine ? '#fff' : known ? colors.ink : colors.inkSoft, textDecorationLine: gone ? 'line-through' : 'none' }}>
              {t.label}{n ? ` · ${n}` : map ? ' · map' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
