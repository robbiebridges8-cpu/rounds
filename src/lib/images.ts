import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type PickedImage = { uri: string; width: number; height: number };

/**
 * Permissions are requested here, at the moment of use, rather than at launch.
 * The plain-English reason lives in app.json.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<PickedImage | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });

  const asset = result.canceled ? null : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

/** Always compress on the device: uploads happen on pub wifi. */
export async function compress(image: PickedImage, maxWidth = 1280): Promise<PickedImage> {
  const context = ImageManipulator.ImageManipulator.manipulate(image.uri);
  if (image.width > maxWidth) context.resize({ width: maxWidth });
  const rendered = await context.renderAsync();
  const output = await rendered.saveAsync({
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: output.uri, width: output.width, height: output.height };
}

export async function uploadImage(bucket: string, path: string, image: PickedImage) {
  const bytes = await new File(image.uri).bytes();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
