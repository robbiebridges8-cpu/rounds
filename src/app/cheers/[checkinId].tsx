import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { APP_NAME } from '@/lib/brand';
import { useCheers, usePost } from '@/lib/feed';
import { pickImage, type PickedImage } from '@/lib/images';
import { colors } from '@/theme';

/**
 * Cheers: a photo back on a mate's check-in. Our own camera, front-facing by
 * default, and the picture saves the way the preview showed it.
 */
export default function CheersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkinId } = useLocalSearchParams<{ checkinId: string }>();
  const post = usePost(checkinId);
  const cheers = useCheers();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('front');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [snapping, setSnapping] = useState(false);

  const who = post.data?.profiles?.display_name;
  const label = who ? `Cheers to ${who}` : 'Cheers';

  const snap = async () => {
    if (!cameraRef.current || snapping) return;
    setSnapping(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (shot) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPhoto({ uri: shot.uri, width: shot.width, height: shot.height });
      }
    } finally {
      setSnapping(false);
    }
  };

  const fromLibrary = async () => {
    const picked = await pickImage('library');
    if (picked) setPhoto(picked);
  };

  const send = () => {
    if (!photo || !checkinId) return;
    cheers.mutate(
      { checkinId, photo },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (error) => Alert.alert('Cheers did not send', error.message),
      },
    );
  };

  const granted = permission?.granted;

  if (photo) {
    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: photo.uri }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />
        <View className="absolute left-0 right-0 flex-row items-center justify-between px-5" style={{ top: insets.top + 8 }}>
          <Pressable onPress={() => setPhoto(null)} hitSlop={10} accessibilityRole="button">
            <Text className="text-[16px] font-bold text-white">Retake</Text>
          </Pressable>
          <View className="h-8 flex-row items-center rounded-full bg-white px-3">
            <Text className="text-[12px] font-bold" style={{ color: '#101014' }} numberOfLines={1}>{label}</Text>
          </View>
          <View style={{ width: 52 }} />
        </View>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} className="absolute bottom-0 left-0 right-0 px-6" style={{ paddingBottom: insets.bottom + 16, paddingTop: 60 }}>
          <Pressable onPress={send} disabled={cheers.isPending} accessibilityRole="button" className="h-14 flex-row items-center justify-center gap-2 rounded-full active:opacity-80" style={{ backgroundColor: colors.butter }}>
            {cheers.isPending ? <ActivityIndicator color="#101014" /> : <Text className="text-[17px] font-bold" style={{ color: '#101014' }}>Send cheers</Text>}
          </Pressable>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {granted ? (
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} mirror />
      ) : (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Icon name="camera.fill" size={40} color="#fff" weight="regular" />
          <Text className="text-center text-[17px] font-bold text-white">Cheers is a photo back</Text>
          <Text className="text-center text-[14px] text-white" style={{ opacity: 0.75 }}>
            {permission?.canAskAgain === false ? `Camera is off for ${APP_NAME}. Allow it in Settings.` : 'Allow the camera to send one.'}
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
        <View className="h-8 max-w-[220px] flex-row items-center rounded-full px-3" style={{ backgroundColor: colors.butter }}>
          <Text className="text-[12px] font-bold" style={{ color: '#101014' }} numberOfLines={1}>{label}</Text>
        </View>
        <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Flip camera">
          <Icon name="arrow.triangle.2.circlepath.camera" size={24} color="#fff" weight="semibold" />
        </Pressable>
      </View>

      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} className="absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16, paddingTop: 40 }}>
        <View className="flex-row items-center justify-center gap-8 px-6">
          <Pressable onPress={() => void fromLibrary()} accessibilityRole="button" accessibilityLabel="Choose from library" className="h-12 w-12 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Icon name="photo.on.rectangle" size={20} color="#fff" weight="semibold" />
          </Pressable>
          <Pressable onPress={() => void snap()} disabled={!granted || snapping} accessibilityRole="button" accessibilityLabel="Take photo" className="h-[80px] w-[80px] items-center justify-center rounded-full border-[5px] border-white" style={{ opacity: granted ? 1 : 0.4 }}>
            {snapping ? <ActivityIndicator color="#fff" /> : <View className="h-[60px] w-[60px] rounded-full bg-white" />}
          </Pressable>
          <View style={{ width: 48 }} />
        </View>
      </LinearGradient>
    </View>
  );
}
