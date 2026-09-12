import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Icon, Stars } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { useCreateCheckin } from '@/lib/checkins';
import { useFriendships } from '@/lib/friends';
import { pickImage, type PickedImage } from '@/lib/images';
import { inviteLink, useInviteCode } from '@/lib/invites';
import { offerWeeklyNudge } from '@/lib/notifications';
import { useConfirmTags, usePub, usePubTagStats, usePubTags } from '@/lib/pubs';
import { colors, fonts } from '@/theme';

const LABELS: Record<string, string> = {
  '0.5': 'Never again', '1': 'Grim', '1.5': 'Poor', '2': 'Meh', '2.5': 'Fine',
  '3': 'Decent', '3.5': 'Good', '4': 'Very good', '4.5': 'Excellent', '5': 'Belter',
};

/**
 * Camera first. The sheet opens on the viewfinder: the photo is the
 * check-in, and the rating, who was there and a note are a caption laid
 * over it. Skipping the photo is allowed, because basements exist.
 */
export default function CheckinScreen() {
  const { pubId } = useLocalSearchParams<{ pubId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pub = usePub(pubId);
  const create = useCreateCheckin();
  const friendships = useFriendships();
  const { data: me } = useProfile();
  const inviteCode = useInviteCode();
  const tags = usePubTags();
  const tagStats = usePubTagStats(pubId);
  const confirmTags = useConfirmTags();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [step, setStep] = useState<'camera' | 'review'>('camera');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<string[]>([]);
  const [guestName, setGuestName] = useState('');
  const [snapping, setSnapping] = useState(false);

  const pubName = pub.data?.pub.name ?? '';
  const friends = friendships.data?.friends ?? [];

  // Tags others have confirmed come first, so agreeing is one tap.
  const confirmedCount = (slug: string) => {
    const row = tagStats.data?.find((t) => t.tag === slug);
    return (row?.up_votes ?? 0) + (row?.osm ? 1 : 0);
  };
  const tagOrder = [...(tags.data ?? [])].sort((a, b) => confirmedCount(b.slug) - confirmedCount(a.slug) || a.sort_order - b.sort_order);
  const togglePick = (slug: string) => {
    void Haptics.selectionAsync();
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const snap = async () => {
    if (!cameraRef.current || snapping) return;
    setSnapping(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (shot) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPhoto({ uri: shot.uri, width: shot.width, height: shot.height });
        setStep('review');
      }
    } finally {
      setSnapping(false);
    }
  };

  const fromLibrary = async () => {
    const picked = await pickImage('library');
    if (picked) {
      setPhoto(picked);
      setStep('review');
    }
  };

  const toggleTag = (id: string) => {
    void Haptics.selectionAsync();
    setTagged((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    setGuests((current) => [...current, name]);
    setGuestName('');
  };

  const textGuests = async () => {
    if (guests.length === 0 || !me || !inviteCode.data) return;
    if (!(await SMS.isAvailableAsync())) return;
    await SMS.sendSMSAsync(
      [],
      `${me.display_name} put you at ${pubName || 'the pub'} on Rounds, the pub map for you and your mates. Claim it: ${inviteLink(inviteCode.data)} (code ${inviteCode.data})`
    );
  };

  const submit = () => {
    if (!pub.data) return;
    create.mutate(
      {
        pubId: pub.data.pub.id,
        pubCoords: { latitude: pub.data.pub.lat, longitude: pub.data.pub.lng },
        rating: rating || null,
        note,
        photos: photo ? [photo] : [],
        tagIds: [...tagged],
        guests,
      },
      {
        onSuccess: async ({ photoError }) => {
          void Haptics.notificationAsync(photoError ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
          if (picked.size) confirmTags.mutate({ pubId: pub.data!.pub.id, slugs: [...picked] });
          router.back();
          void offerWeeklyNudge();
          if (photoError) Alert.alert('Checked in, but the photo did not upload', photoError);
          await textGuests();
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Check-in did not save', error.message);
        },
      }
    );
  };

  // ---------------------------------------------------------------- camera
  if (step === 'camera') {
    const granted = permission?.granted;
    return (
      <View className="flex-1 bg-black">
        {granted ? (
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} mirror />
        ) : (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Icon name="camera.fill" size={40} color="#fff" weight="regular" />
            <Text className="text-center text-[17px] font-bold text-white">A check-in starts with a photo</Text>
            <Text className="text-center text-[14px] text-white" style={{ opacity: 0.75 }}>
              {permission?.canAskAgain === false ? 'Camera is off for Rounds. Allow it in Settings, or skip the photo.' : 'Allow the camera, or skip the photo.'}
            </Text>
            {permission?.canAskAgain !== false ? (
              <Pressable onPress={() => void requestPermission()} className="h-12 items-center justify-center rounded-full bg-white px-6">
                <Text className="text-[15px] font-bold" style={{ color: '#101014' }}>Allow camera</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View className="absolute left-0 right-0 flex-row items-center justify-between px-5" style={{ top: insets.top + 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
            <Text className="text-[16px] font-bold text-white">Cancel</Text>
          </Pressable>
          <View className="h-8 max-w-[200px] flex-row items-center gap-1.5 rounded-full bg-white px-3">
            <Icon name="mappin.and.ellipse" size={12} color="#101014" weight="bold" />
            <Text className="text-[12px] font-bold" style={{ color: '#101014' }} numberOfLines={1}>{pubName || ' '}</Text>
          </View>
          <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Flip camera">
            <Icon name="arrow.triangle.2.circlepath.camera" size={24} color="#fff" weight="semibold" />
          </Pressable>
        </View>

        {granted ? <View pointerEvents="none" className="absolute left-6 right-6 rounded-lg border-2" style={{ top: insets.top + 60, bottom: 220, borderColor: 'rgba(255,255,255,0.55)' }} /> : null}

        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16, paddingTop: 40 }}>
          <View className="flex-row items-center justify-center gap-8 px-6">
            <Pressable onPress={() => void fromLibrary()} accessibilityRole="button" accessibilityLabel="Choose from library" className="h-12 w-12 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Icon name="photo.on.rectangle" size={20} color="#fff" weight="semibold" />
            </Pressable>
            <Pressable onPress={() => void snap()} disabled={!granted || snapping} accessibilityRole="button" accessibilityLabel="Take photo" className="h-[80px] w-[80px] items-center justify-center rounded-full border-[5px] border-white" style={{ opacity: granted ? 1 : 0.4 }}>
              {snapping ? <ActivityIndicator color="#fff" /> : <View className="h-[60px] w-[60px] rounded-full bg-white" />}
            </Pressable>
            <Pressable onPress={() => setStep('review')} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Icon name="forward.end.fill" size={18} color="#fff" weight="semibold" />
            </Pressable>
          </View>
          <Text className="mt-3 text-center text-[12px] font-semibold text-white" style={{ opacity: 0.7 }}>Library · Take a photo · Skip</Text>
        </LinearGradient>
      </View>
    );
  }

  // ---------------------------------------------------------------- review
  return (
    <View className="flex-1 bg-black">
      {photo ? (
        <Image source={{ uri: photo.uri }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />
      ) : (
        <View className="absolute inset-0" style={{ backgroundColor: colors.you }} />
      )}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} className="absolute left-0 right-0 top-0" style={{ height: 140 }} />

      <View className="absolute left-0 right-0 flex-row items-center justify-between px-5" style={{ top: insets.top + 8 }}>
        <Pressable onPress={() => setStep('camera')} hitSlop={10} accessibilityRole="button">
          <Text className="text-[16px] font-bold text-white">{photo ? 'Retake' : 'Add photo'}</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 16, color: '#fff' }} numberOfLines={1}>{pubName}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text className="text-[16px] font-bold text-white">Cancel</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']} style={{ paddingTop: 60 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5" style={{ maxHeight: 520 }}>
            <View className="items-center gap-1">
              <Stars value={rating} onChange={(v) => { void Haptics.selectionAsync(); setRating(v); }} size={34} color={colors.butter} />
              <Text className="text-[13px] font-bold text-white" style={{ opacity: 0.85 }}>
                {rating ? `${LABELS[String(rating)]} · ${rating} stars` : 'How was it?'}
              </Text>
            </View>

            {friends.length > 0 || guests.length > 0 ? (
              <View className="flex-row flex-wrap justify-center gap-2">
                {friends.map((f) => {
                  const on = tagged.has(f.id);
                  return (
                    <Pressable key={f.id} onPress={() => toggleTag(f.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} className="h-10 flex-row items-center gap-2 rounded-full pl-1 pr-3.5" style={{ backgroundColor: on ? colors.ale : 'rgba(255,255,255,0.18)' }}>
                      <Avatar url={f.avatar_url} name={f.display_name} size={30} />
                      <Text className="text-[14px] font-bold text-white">{f.display_name}</Text>
                    </Pressable>
                  );
                })}
                {guests.map((g, i) => (
                  <Pressable key={`${g}-${i}`} onPress={() => setGuests((c) => c.filter((_, j) => j !== i))} className="h-10 flex-row items-center gap-1.5 rounded-full px-3.5" style={{ backgroundColor: colors.butter }}>
                    <Text className="text-[14px] font-bold" style={{ color: '#101014' }}>{g}</Text>
                    <Icon name="xmark" size={11} color="#101014" weight="bold" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <TextInput
                value={guestName}
                onChangeText={setGuestName}
                placeholder="Someone not on Rounds"
                placeholderTextColor="rgba(255,255,255,0.55)"
                returnKeyType="done"
                onSubmitEditing={addGuest}
                autoCapitalize="words"
                className="h-11 flex-1 rounded-full px-4 text-[15px] text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              />
              <Pressable onPress={addGuest} disabled={!guestName.trim()} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-white" style={{ opacity: guestName.trim() ? 1 : 0.4 }}>
                <Icon name="plus" size={16} color="#101014" weight="bold" />
              </Pressable>
            </View>

            {tagOrder.length > 0 ? (
              <View className="gap-1.5">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-white" style={{ opacity: 0.7 }}>What&apos;s it got? Optional</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {tagOrder.map((t) => {
                    const on = picked.has(t.slug);
                    const n = confirmedCount(t.slug);
                    return (
                      <Pressable key={t.slug} onPress={() => togglePick(t.slug)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5" style={{ backgroundColor: on ? colors.butter : 'rgba(255,255,255,0.18)' }}>
                        {on ? <Icon name="checkmark" size={11} color="#101014" weight="bold" /> : null}
                        <Text className="text-[13px] font-bold" style={{ color: on ? '#101014' : '#fff' }}>{t.label}{n ? ` · ${n}` : ''}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="A line about it, if you like"
              placeholderTextColor="rgba(255,255,255,0.55)"
              maxLength={500}
              multiline
              className="min-h-[46px] rounded-md px-4 py-3 text-[15px] text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', textAlignVertical: 'top' }}
            />

            <Pressable onPress={submit} disabled={!pub.data || create.isPending} accessibilityRole="button" className="h-[54px] flex-row items-center justify-center gap-2 rounded-full" style={{ backgroundColor: colors.butter, marginBottom: insets.bottom + 16, opacity: pub.data ? 1 : 0.5 }}>
              {create.isPending ? <ActivityIndicator color="#101014" /> : (
                <>
                  <Icon name="mappin.and.ellipse" size={16} color="#101014" weight="bold" />
                  <Text className="text-[17px] font-bold" style={{ color: '#101014' }}>Check in{photo ? '' : ' without a photo'}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}
