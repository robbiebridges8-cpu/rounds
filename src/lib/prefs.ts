import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** A remembered on/off for things we are trying out. */
export function usePref(key: string, initial = false): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    AsyncStorage.getItem(`rounds.pref.${key}`)
      .then((v) => {
        if (v != null) setValue(v === '1');
      })
      .catch(() => undefined);
  }, [key]);
  const set = (v: boolean) => {
    setValue(v);
    AsyncStorage.setItem(`rounds.pref.${key}`, v ? '1' : '0').catch(() => undefined);
  };
  return [value, set];
}
