const STORAGE_KEY = 'playHistory';

export type PlayHistory = Record<string, string>;

export async function loadPlayHistory(): Promise<PlayHistory> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.loadUserData(STORAGE_KEY);
      if (result.success && result.data && typeof result.data === 'object') {
        return result.data as PlayHistory;
      }
    }
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`quark-${STORAGE_KEY}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as PlayHistory;
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return {};
}

export async function persistPlayHistory(history: PlayHistory): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveUserData(STORAGE_KEY, history);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`quark-${STORAGE_KEY}`, JSON.stringify(history));
    }
  } catch {
    // best-effort persistence
  }
}

export function recordGameLaunch(history: PlayHistory, gameId: string): PlayHistory {
  return { ...history, [gameId]: new Date().toISOString() };
}

export function getRecentlyPlayedIds(history: PlayHistory): string[] {
  return Object.entries(history)
    .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([id]) => id);
}
