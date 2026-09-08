import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

/** Central London. Where the map opens before we know where you are. */
export const LONDON_REGION = {
  latitude: 51.5136,
  longitude: -0.1191,
  latitudeDelta: 0.04,
  longitudeDelta: 0.03,
};

/**
 * Asks for permission at the moment of use and returns null rather than
 * throwing when it is refused, so callers degrade to "no location" cleanly.
 */
export async function getPosition(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/** Haversine, in metres. Good enough for a 150 m geofence. */
export function distanceMetres(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
