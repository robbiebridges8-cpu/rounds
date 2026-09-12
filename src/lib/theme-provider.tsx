import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { applyPalette, paletteVars, palettes, type Scheme } from '@/theme';

export type { Scheme };

const KEY = 'pubd.scheme';

type ThemeState = { scheme: Scheme; ready: boolean; setScheme: (s: Scheme) => void };

const ThemeContext = createContext<ThemeState>({ scheme: 'light', ready: false, setScheme: () => undefined });

/**
 * Light by default, dark by choice, remembered on the device. Toggling
 * swaps the live palette and remounts the tree (the key), which is the
 * cheapest correct way to get every native prop and SVG re-read its colour.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        // Dark and Pub are paused until they have had a proper pass; see BACKLOG 22.
        if (saved === 'light') setSchemeState(saved);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setScheme = (next: Scheme) => {
    setSchemeState(next);
    AsyncStorage.setItem(KEY, next).catch(() => undefined);
  };

  // Mutate before children render so every colors.x read this pass is right.
  applyPalette(scheme);
  const style = useMemo(() => vars(paletteVars(palettes[scheme])), [scheme]);

  return (
    <ThemeContext.Provider value={{ scheme, ready, setScheme }}>
      <View key={scheme} style={[{ flex: 1 }, style]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
