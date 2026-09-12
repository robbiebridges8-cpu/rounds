import { useSyncExternalStore } from 'react';

type State = { uris: string[]; index: number } | null;
let state: State = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Open the full-screen viewer on a set of photos. Anywhere in the app. */
export function openPhotos(uris: string[], index = 0) {
  if (uris.length === 0) return;
  state = { uris, index: Math.max(0, Math.min(index, uris.length - 1)) };
  notify();
}

export function closePhotos() {
  state = null;
  notify();
}

export function usePhotoViewer(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => null,
  );
}
