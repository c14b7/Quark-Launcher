const STORAGE_KEY = 'playHistory';
const LAUNCH_STATS_KEY = 'launchStats';
const NOTES_KEY = 'gameNotes';

export type PlayHistory = Record<string, string>;

export interface GameLaunchStats {
  lastPlayed: string;
  firstPlayed: string;
  launchCount: number;
  totalSessionSec?: number;
  sessionCount?: number;
  lastSessionSec?: number;
}

export type LaunchStatsMap = Record<string, GameLaunchStats>;

function normalizeStats(raw: unknown, gameId: string): GameLaunchStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<GameLaunchStats>;
  if (!o.lastPlayed) return null;
  return {
    lastPlayed: o.lastPlayed,
    firstPlayed: o.firstPlayed || o.lastPlayed,
    launchCount: typeof o.launchCount === 'number' ? o.launchCount : 1,
    totalSessionSec: typeof o.totalSessionSec === 'number' ? o.totalSessionSec : 0,
    sessionCount: typeof o.sessionCount === 'number' ? o.sessionCount : 0,
    lastSessionSec: typeof o.lastSessionSec === 'number' ? o.lastSessionSec : undefined,
  };
}

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
    /* ignore */
  }
  return {};
}

export async function loadLaunchStats(): Promise<LaunchStatsMap> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.loadUserData(LAUNCH_STATS_KEY);
      if (result.success && result.data && typeof result.data === 'object') {
        return result.data as LaunchStatsMap;
      }
    }
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`quark-${LAUNCH_STATS_KEY}`);
      if (raw) return JSON.parse(raw) as LaunchStatsMap;
    }
  } catch {
    /* ignore */
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
    /* ignore */
  }
}

export async function persistLaunchStats(stats: LaunchStatsMap): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveUserData(LAUNCH_STATS_KEY, stats);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`quark-${LAUNCH_STATS_KEY}`, JSON.stringify(stats));
    }
  } catch {
    /* ignore */
  }
}

export function recordGameLaunch(history: PlayHistory, gameId: string): PlayHistory {
  return { ...history, [gameId]: new Date().toISOString() };
}

export function recordLaunchStats(stats: LaunchStatsMap, gameId: string): LaunchStatsMap {
  const now = new Date().toISOString();
  const prev = stats[gameId];
  return {
    ...stats,
    [gameId]: {
      lastPlayed: now,
      firstPlayed: prev?.firstPlayed || now,
      launchCount: (prev?.launchCount || 0) + 1,
      totalSessionSec: prev?.totalSessionSec || 0,
      sessionCount: prev?.sessionCount || 0,
      lastSessionSec: prev?.lastSessionSec,
    },
  };
}

export function applySessionToLaunchStats(
  stats: LaunchStatsMap,
  gameId: string,
  durationSec: number
): LaunchStatsMap {
  const prev = stats[gameId];
  const now = new Date().toISOString();
  return {
    ...stats,
    [gameId]: {
      lastPlayed: prev?.lastPlayed || now,
      firstPlayed: prev?.firstPlayed || now,
      launchCount: prev?.launchCount || 1,
      totalSessionSec: (prev?.totalSessionSec || 0) + Math.max(0, durationSec),
      sessionCount: (prev?.sessionCount || 0) + 1,
      lastSessionSec: Math.max(0, durationSec),
    },
  };
}

export function getRecentlyPlayedIds(history: PlayHistory): string[] {
  return Object.entries(history)
    .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([id]) => id);
}

export async function loadGameNotes(): Promise<Record<string, string>> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.loadUserData(NOTES_KEY);
      if (result.success && result.data && typeof result.data === 'object') {
        return result.data as Record<string, string>;
      }
    }
    const raw = localStorage.getItem(`quark-${NOTES_KEY}`);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {};
}

export async function saveGameNote(gameId: string, note: string): Promise<void> {
  const all = await loadGameNotes();
  if (note.trim()) all[gameId] = note.trim().slice(0, 500);
  else delete all[gameId];
  if (typeof window !== 'undefined' && window.electronAPI) {
    await window.electronAPI.saveUserData(NOTES_KEY, all);
  } else if (typeof window !== 'undefined') {
    localStorage.setItem(`quark-${NOTES_KEY}`, JSON.stringify(all));
  }
}
