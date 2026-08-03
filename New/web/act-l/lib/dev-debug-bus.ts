export type DevLogSource = 'telemetry' | 'window' | 'ipc' | 'error' | 'test' | 'system';

export interface DevLogEntry {
  id: string;
  ts: string;
  source: DevLogSource;
  name: string;
  data?: unknown;
}

export type DevTestAction =
  | 'update-banner'
  | 'dialog-banner'
  | 'side-banner'
  | 'overlay-toast'
  | 'os-notification'
  | 'custom-event';

const MAX_ENTRIES = 400;
const CHANNEL_NAME = 'quark-dev-debug';
const STORAGE_KEY = 'quark-dev-event-log';

let entries: DevLogEntry[] = [];
const listeners = new Set<() => void>();
let captureStarted = false;
let channel: BroadcastChannel | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function persistSnapshot() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 80)));
  } catch {
    /* ignore */
  }
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'entry' && msg.entry) {
        ingestRemote(msg.entry as DevLogEntry);
      }
      if (msg.type === 'clear') {
        entries = [];
        persistSnapshot();
        notify();
      }
      if (msg.type === 'test') {
        window.dispatchEvent(
          new CustomEvent('quark-dev-test', {
            detail: { action: msg.action as DevTestAction, payload: msg.payload },
          })
        );
      }
      if (msg.type === 'sync-request') {
        channel?.postMessage({ type: 'sync', entries });
      }
      if (msg.type === 'sync' && Array.isArray(msg.entries)) {
        mergeRemote(msg.entries as DevLogEntry[]);
      }
    };
  }
  return channel;
}

function ingestRemote(entry: DevLogEntry) {
  if (entries.some((e) => e.id === entry.id)) return;
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  persistSnapshot();
  notify();
}

function mergeRemote(remote: DevLogEntry[]) {
  const map = new Map<string, DevLogEntry>();
  [...remote, ...entries].forEach((e) => map.set(e.id, e));
  entries = Array.from(map.values())
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, MAX_ENTRIES);
  persistSnapshot();
  notify();
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pushDevLog(
  source: DevLogSource,
  name: string,
  data?: unknown,
  opts?: { broadcast?: boolean }
): void {
  if (typeof window === 'undefined') return;
  const entry: DevLogEntry = {
    id: newId(),
    ts: new Date().toISOString(),
    source,
    name,
    data,
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  persistSnapshot();
  notify();
  if (opts?.broadcast !== false) {
    try {
      getChannel()?.postMessage({ type: 'entry', entry });
    } catch {
      /* ignore */
    }
  }
}

export function getDevLog(): DevLogEntry[] {
  return entries;
}

export function clearDevLog(): void {
  entries = [];
  persistSnapshot();
  notify();
  try {
    getChannel()?.postMessage({ type: 'clear' });
  } catch {
    /* ignore */
  }
}

export function subscribeDevLog(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function requestDevTest(action: DevTestAction, payload?: unknown): void {
  pushDevLog('test', action, payload);
  window.dispatchEvent(new CustomEvent('quark-dev-test', { detail: { action, payload } }));
  try {
    getChannel()?.postMessage({ type: 'test', action, payload });
  } catch {
    /* ignore */
  }
}

/** Restore recent log + start listening for quark-* DOM events. */
export function startDevEventCapture(): void {
  if (typeof window === 'undefined' || captureStarted) return;
  captureStarted = true;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DevLogEntry[];
      if (Array.isArray(parsed)) entries = parsed.slice(0, MAX_ENTRIES);
    }
  } catch {
    /* ignore */
  }

  getChannel()?.postMessage({ type: 'sync-request' });

  const quarkTypes = [
    'quark-dev-unlocked',
    'quark-navigate',
    'quark-dev-test',
  ];

  quarkTypes.forEach((type) => {
    window.addEventListener(type, (e) => {
      const detail = (e as CustomEvent).detail;
      pushDevLog('window', type, detail, { broadcast: true });
    });
  });

  window.addEventListener('error', (e) => {
    pushDevLog('error', 'window.error', { message: e.message, filename: e.filename, lineno: e.lineno });
  });

  window.addEventListener('unhandledrejection', (e) => {
    pushDevLog('error', 'unhandledrejection', {
      reason: e.reason instanceof Error ? e.reason.message : String(e.reason),
    });
  });
}
