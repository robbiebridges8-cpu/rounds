import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { ScorePill } from '@/components/score-pill';
import { Body, Button, Field, Icon } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { useCreateCheckin } from '@/lib/checkins';
import { pickImage, type PickedImage } from '@/lib/images';
import { offerWeeklyNudge } from '@/lib/notifications';
import { usePub } from '@/lib/pubs';
import { SENTIMENTS, fetchBucket, useRankPub, useRankings, type Sentiment } from '@/lib/rankings';
import { colors, fonts } from '@/theme';

const MAX_PHOTOS = 3;

type Candidate = { pub_id: string; name: string; borough: string | null };
type Result = { rank_position: number; rank_score: number; rank_total: number };

/**
 * Two things in one sheet. First the check-in: how it was, a note, photos.
 * Then the ranking, Beli style: a few "which do you prefer?" comparisons
 * (a binary search through your pubs with the same sentiment) and the pub
 * takes its place on your list with a score out of ten.
 *
 * With ?rank=1 the check-in step is skipped and you just re-rank.
 */
export default function CheckinSheet() {
  const { pubId, rank } = useLocalSearchParams<{ pubId: string; rank?: string }>();
  const rankOnly = rank === '1';
  const router = useRouter();
  const { session } = useSession();
  const pub = usePub(pubId);
  const rankings = useRankings(session?.user.id);
  const create = useCreateCheckin();
  const rankPub = useRankPub();

  const existing = rankings.data?.find((r) => r.pub_id === pubId);

  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [step, setStep] = useState<'form' | 'compare' | 'done'>('form');
  const [bucket, setBucket] = useState<Candidate[]>([]);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const pubName = pub.data?.pub.name ?? '';

  const addPhoto = async (source: 'camera' | 'library') => {
    const picked = await pickImage(source);
    if (picked) setPhotos((current) => [...current, picked].slice(0, MAX_PHOTOS));
  };

  const choosePhotoSource = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take a photo', 'Choose from library'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) void addPhoto('camera');
          if (index === 2) void addPhoto('library');
        }
      );
    } else {
      Alert.alert('Add a photo', undefined, [
        { text: 'Take a photo', onPress: () => void addPhoto('camera') },
        { text: 'Choose from library', onPress: () => void addPhoto('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const finishRanking = (index: number) => {
    if (!sentiment) return;
    rankPub.mutate(
      { pubId, sentiment, index },
      {
        onSuccess: (row) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setResult(row);
          setStep('done');
        },
        onError: (error) => {
          Alert.alert('Ranking did not save', error.message);
          router.back();
        },
      }
    );
  };

  const startRanking = async () => {
    if (!sentiment) {
      router.back();
      return;
    }
    setBusy(true);
    try {
      const rows = await fetchBucket(sentiment, pubId);
      const candidates = rows
        .filter((r) => r.pubs)
        .map((r) => ({ pub_id: r.pub_id, name: r.pubs!.name, borough: r.pubs!.borough }));
      if (candidates.length === 0) {
        finishRanking(0);
        return;
      }
      setBucket(candidates);
      setRange([0, candidates.length]);
      setStep('compare');
    } catch (error) {
      Alert.alert('Could not load your list', error instanceof Error ? error.message : String(error));
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!pub.data) return;
    if (rankOnly) {
      void startRanking();
      return;
    }
    create.mutate(
      {
        pubId: pub.data.pub.id,
        pubCoords: { latitude: pub.data.pub.lat, longitude: pub.data.pub.lng },
        rating: null,
        note,
        photos,
      },
      {
        onSuccess: ({ photoError }) => {
          void offerWeeklyNudge();
          if (photoError) Alert.alert('Checked in, but the photo did not upload', photoError);
          // Already on your list: the check-in is enough, the score carries.
          if (existing || !sentiment) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
            return;
          }
          void startRanking();
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Check-in did not save', error.message);
        },
      }
    );
  };

  // Binary search. lo..hi is where this pub could still land in the bucket.
  const [lo, hi] = range;
  const mid = Math.floor((lo + hi) / 2);
  const choose = (preferThis: boolean) => {
    void Haptics.selectionAsync();
    const next: [number, number] = preferThis ? [lo, mid] : [mid + 1, hi];
    if (next[0] >= next[1]) {
      finishRanking(next[0]);
      return;
    }
    setRange(next);
  };

  if (step === 'compare') {
    const other = bucket[mid];
    const remaining = Math.ceil(Math.log2(Math.max(2, hi - lo)));
    return (
      <View className="flex-1 bg-canvas px-5 pb-10 pt-4">
        <View className="flex-row items-center justify-between">
          <View style={{ width: 52 }} />
          <Text className="text-ink text-[17px] font-semibold">Which do you prefer?</Text>
          <Text className="text-ink-soft w-[52px] text-right text-[13px]">{remaining} left</Text>
        </View>
        <Body>
          {sentiment === 'loved'
            ? 'Both loved. Which is better?'
            : sentiment === 'fine'
              ? 'Both decent. Which edges it?'
              : 'Neither great. Which was less bad?'}
        </Body>
        <View className="flex-1 justify-center gap-4">
          <Animated.View key={`a-${mid}`} entering={FadeInRight.springify().damping(18)}>
            <Choice name={pubName} borough={pub.data?.pub.borough} tag="Just now" onPress={() => choose(true)} />
          </Animated.View>
          <Text className="text-ink-soft text-center text-[13px] font-semibold uppercase tracking-wide">or</Text>
          <Animated.View key={`b-${mid}`} entering={FadeInRight.springify().damping(18).delay(60)}>
            <Choice name={other.name} borough={other.borough} tag="On your list" onPress={() => choose(false)} />
          </Animated.View>
        </View>
      </View>
    );
  }

  if (step === 'done' && result) {
    return (
      <Animated.View entering={FadeIn} className="flex-1 items-center justify-center gap-4 bg-canvas px-8 pb-10">
        <ScorePill score={result.rank_score} size="lg" />
        <Text className="text-ink font-display text-center text-[30px] leading-9">{pubName}</Text>
        <Text className="text-ink-soft text-center text-[17px]">
          #{result.rank_position + 1} of {result.rank_total} on your list
        </Text>
        <View className="w-full pt-6">
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </Animated.View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-5 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ale text-[17px]">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-semibold">{rankOnly ? 'Rank it' : 'Check in'}</Text>
        <View style={{ width: 52 }} />
      </View>

      <View className="gap-1">
        <Text className="text-ink font-display text-[28px] leading-9">{pubName || ' '}</Text>
        {existing && !rankOnly ? (
          <View className="flex-row items-center gap-2">
            <ScorePill score={existing.score} size="sm" rank={existing.position + 1} />
            <Text className="text-ink-soft text-[15px]">already on your list</Text>
          </View>
        ) : (
          <Body>How was it? You will place it against your other pubs next.</Body>
        )}
      </View>

      {!existing || rankOnly ? (
        <View className="flex-row gap-2">
          {SENTIMENTS.map((s) => {
            const on = sentiment === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSentiment(on ? null : s.key);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                className={`flex-1 items-center gap-2 rounded-lg border py-4 ${
                  on ? 'border-ale bg-ale-tint' : 'border-line bg-surface active:bg-raised'
                }`}>
                <Icon name={s.icon} size={22} color={on ? colors.ale : colors.inkSoft} />
                <Text className={`text-[13px] font-semibold ${on ? 'text-ale' : 'text-ink-soft'}`}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!rankOnly ? (
        <>
          <Field
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="Who you were with, what you drank, anything worth remembering."
            multiline
            maxLength={500}
          />

          <View className="gap-2">
            <Text className="text-ink text-sm font-bold uppercase tracking-wide">Photos</Text>
            <View className="flex-row gap-3">
              {photos.map((photo, index) => (
                <Pressable
                  key={photo.uri}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}>
                  <Image source={{ uri: photo.uri }} style={{ width: 88, height: 88, borderRadius: 12 }} contentFit="cover" />
                  <View className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-surface">
                    <Icon name="xmark.circle.fill" size={22} color={colors.ink} />
                  </View>
                </Pressable>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <Pressable
                  onPress={choosePhotoSource}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo"
                  className="h-[88px] w-[88px] items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface active:bg-ale-tint">
                  <Icon name="camera" size={24} color={colors.ale} />
                </Pressable>
              ) : null}
            </View>
            <Text className="text-ink-soft text-[12px]">A photo is what lets mates say cheers back.</Text>
          </View>
        </>
      ) : null}

      <Button
        label={rankOnly ? 'Start comparing' : sentiment && !existing ? 'Check in and rank' : 'Check in'}
        onPress={submit}
        loading={create.isPending || rankPub.isPending || busy}
        disabled={!pub.data || (rankOnly && !sentiment)}
      />
    </ScrollView>
  );
}

function Choice({
  name,
  borough,
  tag,
  onPress,
}: {
  name: string;
  borough: string | null | undefined;
  tag: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-[132px] justify-center rounded-lg border border-line bg-surface px-5 py-5 active:border-ale active:bg-ale-tint">
      <Text className="text-ink-soft text-[11px] font-bold uppercase tracking-wider">{tag}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink, marginTop: 6 }}>
        {name}
      </Text>
      {borough ? <Text className="text-ink-soft mt-1 text-[15px]">{borough}</Text> : null}
    </Pressable>
  );
}
