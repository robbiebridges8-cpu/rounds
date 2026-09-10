import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A remembered on/off for things we are trying out. One store shared by
 * every screen, so a switch in Settings changes the map immediately.
 */
const values = new Map<string, boolean>();
const listeners = new Set<() => void>();
const loaded = new Set<string>();

const notify = () => listeners.forEach((l) => l());

function load(key: string) {
  if (loaded.has(key)) return;
  loaded.add(key);
  AsyncStorage.getItem(`rounds.pref.${key}`)
    .then((v) => {
      if (v != null) {
        values.set(key, v === '1');
        notify();
      }
    })
    .catch(() => undefined);
}

export function setPref(key: string, v: boolean) {
  values.set(key, v);
  notify();
  AsyncStorage.setItem(`rounds.pref.${key}`, v ? '1' : '0').catch(() => undefined);
}

export function usePref(key: string, initial = false): [boolean, (v: boolean) => void] {
  load(key);
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => values.get(key) ?? initial,
    () => initial
  );
  return [value, (v: boolean) => setPref(key, v)];
}
