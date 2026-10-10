export interface MediaSessionSnapshot {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  isPlaying?: boolean;
  positionSec?: number;
  durationSec?: number;
  appName?: string;
  updatedAt?: string;
}

type Listener = (session: MediaSessionSnapshot | null) => void;

let lastSession: MediaSessionSnapshot | null = null;
const listeners = new Set<Listener>();
let started = false;

export function getMediaSession(): MediaSessionSnapshot | null {
  return lastSession;
}

export function subscribeMediaSession(fn: Listener): () => void {
  listeners.add(fn);
  fn(lastSession);
  ensureMediaBridge();
  return () => listeners.delete(fn);
}

function emit(session: MediaSessionSnapshot | null) {
  lastSession = session;
  listeners.forEach((fn) => fn(session));
}

function ensureMediaBridge() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const api = window.electronAPI as {
    onMediaSessionUpdate?: (cb: (s: MediaSessionSnapshot | null) => void) => () => void;
    mediaGetSession?: () => Promise<{ success: boolean; data?: MediaSessionSnapshot | null }>;
  };
  if (api.onMediaSessionUpdate) {
    api.onMediaSessionUpdate((s) => emit(s || null));
  }
  if (api.mediaGetSession) {
    void api.mediaGetSession().then((r) => {
      if (r.success) emit(r.data || null);
    });
  }
}

export async function mediaPlayPause() {
  return window.electronAPI?.mediaPlayPause?.();
}

export async function mediaNext() {
  return window.electronAPI?.mediaNext?.();
}

export async function mediaPrevious() {
  return window.electronAPI?.mediaPrevious?.();
}
