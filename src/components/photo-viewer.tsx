import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { closePhotos, usePhotoViewer } from '@/lib/photo-viewer';

/**
 * Full-screen photos: swipe between them, pinch to zoom, tap the x. One
 * instance lives in the root layout; anything calls openPhotos().
 */
export function PhotoViewer() {
  const state = usePhotoViewer();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const open = state != null;

  return (
    <Modal visible={open} animationType="fade" transparent={false} onRequestClose={closePhotos} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {state ? (
          <FlatList
            data={state.uris}
            keyExtractor={(uri, i) => `${i}-${uri}`}
            horizontal
            pagingEnabled
            initialScrollIndex={state.index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width, height }}
                contentContainerStyle={{ width, height }}
                maximumZoomScale={4}
                minimumZoomScale={1}
                bouncesZoom
                centerContent
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}>
                <Image source={{ uri: item }} style={{ width, height }} contentFit="contain" transition={120} />
              </ScrollView>
            )}
          />
        ) : null}
        <Pressable onPress={closePhotos} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={{ position: 'absolute', right: 16, top: insets.top + 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="xmark" size={16} color="#fff" weight="bold" />
        </Pressable>
        {state && state.uris.length > 1 ? (
          <Text style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 14, textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' }}>
            {`${state.uris.length} photos · swipe`}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}
