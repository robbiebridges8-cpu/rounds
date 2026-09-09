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
import { useMyTagVotes, usePub, usePubPhotos, usePubTagStats, usePubTags, usePubVisits, useReportPub, useVoteTag, type CorrectionType } from '@/lib/pubs';
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

          <View>
            <SectionTitle>What it is like</SectionTitle>
            <Card>
              {sortedTags.map((tag, index) => {
                const net = netFor(tag.slug);
                const mine = myVoteFor(tag.slug);
                return (
                  <View key={tag.slug} className={`flex-row items-center gap-3 py-2 pl-4 pr-2 ${index === sortedTags.length - 1 ? '' : 'border-b border-line'}`}>
                    <Text className="text-ink flex-1 text-[17px]">{tag.label}</Text>
                    <Text className={`w-8 text-right text-[15px] font-bold ${net > 0 ? 'text-you' : net < 0 ? 'text-danger' : 'text-slate'}`}>{net > 0 ? `+${net}` : net}</Text>
                    <VoteButton icon={mine === 1 ? 'hand.thumbsup.fill' : 'hand.thumbsup'} active={mine === 1} label={`Yes, ${tag.label.toLowerCase()}`} onPress={() => castVote(tag.slug, 1)} />
                    <VoteButton icon={mine === -1 ? 'hand.thumbsdown.fill' : 'hand.thumbsdown'} active={mine === -1} label={`No, not ${tag.label.toLowerCase()}`} onPress={() => castVote(tag.slug, -1)} />
                  </View>
                );
              })}
            </Card>
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

function VoteButton({ icon, active, label, onPress }: { icon: 'hand.thumbsup' | 'hand.thumbsup.fill' | 'hand.thumbsdown' | 'hand.thumbsdown.fill'; active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} className={`h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-ale-tint' : 'active:bg-raised'}`}>
      <Icon name={icon} size={20} color={active ? colors.ale : colors.inkSoft} />
    </Pressable>
  );
}
