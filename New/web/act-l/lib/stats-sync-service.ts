import { apiRequest } from '@/lib/api-client';
import { loadLaunchStats } from '@/lib/play-history';
import { loadPlaySessions } from '@/lib/play-session-tracker';
import { buildQuarkStats, buildPublicStatsSummary } from '@/lib/stats-engine';
import type { Game } from '@/lib/types';
import type { AppSettings } from '@/lib/settings-context';
import { getProfileDisplayPrefs } from '@/lib/profile-preferences';
import { pushDevLog } from '@/lib/dev-debug-bus';

export type StatsVisibility = 'friends' | 'private';

export interface PublicStatsSummary {
  totals: {
    launches: number;
    sessionHours: number;
    steamHours: number;
    streakDays: number;
    uniqueGames: number;
  };
  topGames: Array<{
    name: string;
    image?: string;
    launchCount: number;
    hours?: number;
  }>;
  topGenres: Array<{ name: string; share: number }>;
  showcase?: {
    motto?: string;
    favoriteGameName?: string;
    favoriteGameImage?: string;
  };
  updatedAt?: string;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastPayload: PublicStatsSummary | null = null;
let cachedGames: Game[] = [];
let cachedSettings: Pick<AppSettings, 'customCategories'> = { customCategories: [] };
let cachedPreferences: string | null = null;
let visibility: StatsVisibility = 'friends';

export function setStatsSyncContext(opts: {
  games?: Game[];
  settings?: Pick<AppSettings, 'customCategories'>;
  preferences?: string | null;
  visibility?: StatsVisibility;
}) {
  if (opts.games) cachedGames = opts.games;
  if (opts.settings) cachedSettings = opts.settings;
  if (opts.preferences !== undefined) cachedPreferences = opts.preferences;
  if (opts.visibility) visibility = opts.visibility;
}

export function getLastStatsSyncPayload() {
  return lastPayload;
}

export function getStatsVisibility() {
  return visibility;
}

export function scheduleStatsSync(delayMs = 4000) {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncStatsNow();
  }, delayMs);
}

export async function buildLocalPublicSummary(): Promise<PublicStatsSummary> {
  const [launchStats, sessions] = await Promise.all([loadLaunchStats(), loadPlaySessions()]);
  const snap = buildQuarkStats(cachedGames, launchStats, sessions, cachedSettings, 'allTime');
  const showcase = getProfileDisplayPrefs(cachedPreferences).showcase;
  return buildPublicStatsSummary(snap, {
    motto: showcase?.motto,
    favoriteGameName: showcase?.favoriteGameName,
    favoriteGameImage: showcase?.favoriteGameImage,
  });
}

export async function syncStatsNow(
  vis: StatsVisibility = visibility
): Promise<{ success: boolean; error?: string; summary?: PublicStatsSummary }> {
  try {
    const summary = await buildLocalPublicSummary();
    lastPayload = summary;
    visibility = vis;
    const result = await apiRequest('/stats/summary', 'PUT', {
      visibility: vis,
      summary,
    });
    if (!result.success) {
      pushDevLog('ipc', 'stats.sync_failed', { error: result.error });
      return { success: false, error: result.error || 'Sync failed', summary };
    }
    pushDevLog('ipc', 'stats.sync_ok', { visibility: vis });
    return { success: true, summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushDevLog('error', 'stats.sync_exception', { error: msg });
    return { success: false, error: msg };
  }
}

export async function fetchMyStats(): Promise<{
  success: boolean;
  visibility?: StatsVisibility;
  summary?: PublicStatsSummary | null;
  error?: string;
}> {
  const result = await apiRequest<{
    visibility?: StatsVisibility;
    summary?: PublicStatsSummary | null;
  }>('/stats/me', 'GET');
  if (!result.success) return { success: false, error: result.error };
  if (result.visibility) visibility = result.visibility;
  return {
    success: true,
    visibility: (result.visibility as StatsVisibility) || 'friends',
    summary: (result.summary as PublicStatsSummary) ?? null,
  };
}

const MOCK_FRIEND_STATS_KEY = 'quark-dev-mock-friend-stats';

export function isMockFriendStatsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MOCK_FRIEND_STATS_KEY) === '1';
}

export function setMockFriendStatsEnabled(on: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_FRIEND_STATS_KEY, on ? '1' : '0');
  pushDevLog('test', 'mockFriendStats', { on });
}

function mockFriendSummary(): PublicStatsSummary {
  return {
    totals: {
      launches: 42,
      sessionHours: 18.5,
      steamHours: 120,
      streakDays: 5,
      uniqueGames: 8,
    },
    topGames: [
      { name: 'Mock RPG', launchCount: 12, hours: 6.2 },
      { name: 'Mock Indie', launchCount: 8, hours: 3.1 },
    ],
    topGenres: [
      { name: 'RPG', share: 0.4 },
      { name: 'Indie', share: 0.25 },
    ],
    showcase: { motto: 'Mock motto (dev)' },
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchFriendStats(userId: string): Promise<{
  success: boolean;
  summary?: PublicStatsSummary | null;
  private?: boolean;
  error?: string;
}> {
  if (isMockFriendStatsEnabled()) {
    return { success: true, summary: mockFriendSummary(), private: false };
  }
  const result = await apiRequest<{
    summary?: PublicStatsSummary | null;
    private?: boolean;
  }>(`/stats/${encodeURIComponent(userId)}`, 'GET');
  if (!result.success) {
    if (result.code === 'STATS_PRIVATE' || result.code === 'NOT_FRIENDS') {
      return { success: true, summary: null, private: true };
    }
    return { success: false, error: result.error };
  }
  return {
    success: true,
    summary: (result.summary as PublicStatsSummary) ?? null,
    private: Boolean(result.private),
  };
}

export async function updateStatsVisibility(vis: StatsVisibility) {
  visibility = vis;
  return syncStatsNow(vis);
}
