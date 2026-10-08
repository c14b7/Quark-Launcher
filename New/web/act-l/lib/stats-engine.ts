import type { Game } from '@/lib/types';
import type { LaunchStatsMap } from '@/lib/play-history';
import type { PlaySession } from '@/lib/play-session-tracker';
import type { AppSettings } from '@/lib/settings-context';

export type StatsPeriod = '7d' | '30d' | 'year' | 'allTime';

export interface StatsGameRow {
  id: string;
  name: string;
  image: string;
  launchCount: number;
  sessionSec: number;
  playtimeMinutes: number;
}

export interface StatsGenreRow {
  name: string;
  count: number;
  share: number;
}

export interface StatsPlatformRow {
  platform: string;
  count: number;
  share: number;
}

export interface StatsHourBucket {
  hour: number;
  count: number;
}

export interface StatsWeekdayBucket {
  day: number; // 0=Sun
  count: number;
  sessionSec: number;
}

export interface StatsInsight {
  id: string;
  /** i18n key under stats.insight_* */
  key: string;
  values?: Record<string, string | number>;
  /** Fallback when i18n missing */
  text: string;
}

export interface QuarkStatsSnapshot {
  period: StatsPeriod;
  generatedAt: string;
  year: number;
  totalLaunches: number;
  uniqueGamesLaunched: number;
  totalSessionSec: number;
  totalSessionHours: number;
  totalSteamMinutes: number;
  totalSteamHours: number;
  streakDays: number;
  topGamesByLaunches: StatsGameRow[];
  topGamesBySession: StatsGameRow[];
  topGamesByPlaytime: StatsGameRow[];
  topGenres: StatsGenreRow[];
  platforms: StatsPlatformRow[];
  recentSessions: PlaySession[];
  hourHistogram: StatsHourBucket[];
  weekdayBars: StatsWeekdayBucket[];
  mostDedicated: StatsGameRow | null;
  favoriteCategory: { name: string; gameCount: number } | null;
  insights: StatsInsight[];
}

function inPeriod(iso: string | undefined, period: StatsPeriod, year: number, now: Date): boolean {
  if (!iso) return period === 'allTime';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (period === 'allTime') return true;
  if (period === 'year') return d.getFullYear() === year;
  const days = period === '7d' ? 7 : 30;
  return d.getTime() >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

function computeStreakFromSessions(sessions: PlaySession[], period: StatsPeriod, year: number, now: Date): number {
  const days = new Set<string>();
  for (const s of sessions) {
    if (!inPeriod(s.startedAt, period, year, now)) continue;
    days.add(s.startedAt.slice(0, 10));
  }
  if (days.size === 0) return 0;
  const sorted = Array.from(days).sort().reverse();
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = new Date(sorted[i]);
    const b = new Date(sorted[i + 1]);
    const diff = Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
}

function buildInsights(
  snap: Omit<QuarkStatsSnapshot, 'insights'>,
  sessions: PlaySession[]
): StatsInsight[] {
  const out: StatsInsight[] = [];
  if (snap.mostDedicated) {
    out.push({
      id: 'dedicated',
      key: 'insightDedicated',
      values: { name: snap.mostDedicated.name },
      text: `Most dedicated: ${snap.mostDedicated.name}`,
    });
  }
  if (snap.streakDays >= 3) {
    out.push({
      id: 'streak',
      key: 'insightStreak',
      values: { days: snap.streakDays },
      text: `Streak: ${snap.streakDays} days in a row`,
    });
  }
  if (snap.topGenres[0]) {
    out.push({
      id: 'genre',
      key: 'insightGenre',
      values: { name: snap.topGenres[0].name },
      text: `Top genre: ${snap.topGenres[0].name}`,
    });
  }
  const late = sessions.filter((s) => {
    const h = new Date(s.startedAt).getHours();
    return h >= 23 || h < 4;
  });
  if (late.length >= 3) {
    out.push({
      id: 'night',
      key: 'insightNight',
      values: { count: late.length },
      text: `${late.length} late-night sessions (after 23:00)`,
    });
  }
  const weekendSec = snap.weekdayBars
    .filter((d) => d.day === 0 || d.day === 6)
    .reduce((a, b) => a + b.sessionSec, 0);
  const weekdaySec = snap.weekdayBars
    .filter((d) => d.day > 0 && d.day < 6)
    .reduce((a, b) => a + b.sessionSec, 0);
  if (weekendSec > weekdaySec && weekendSec > 0) {
    out.push({
      id: 'weekend',
      key: 'insightWeekend',
      text: 'Weekends are your time — more hours Sat/Sun',
    });
  }
  if (snap.totalSessionHours > 0) {
    out.push({
      id: 'hours',
      key: 'insightHours',
      values: { hours: snap.totalSessionHours },
      text: `Quark measured ~${snap.totalSessionHours}h of sessions this period`,
    });
  }
  return out.slice(0, 5);
}

export function buildQuarkStats(
  games: Game[],
  launchStats: LaunchStatsMap,
  sessions: PlaySession[],
  settings: Pick<AppSettings, 'customCategories'>,
  period: StatsPeriod = 'allTime',
  now = new Date()
): QuarkStatsSnapshot {
  const year = now.getFullYear();
  const gameMap = new Map(games.map((g) => [g.id, g]));

  const periodSessions = sessions.filter((s) => inPeriod(s.startedAt, period, year, now));
  const sessionSecByGame = new Map<string, number>();
  const launchesByGame = new Map<string, number>();

  for (const s of periodSessions) {
    const sec = s.durationSec ?? 0;
    sessionSecByGame.set(s.gameId, (sessionSecByGame.get(s.gameId) || 0) + sec);
  }

  let totalLaunches = 0;
  for (const [gameId, st] of Object.entries(launchStats)) {
    if (
      period === 'allTime' ||
      inPeriod(st.lastPlayed, period, year, now) ||
      inPeriod(st.firstPlayed, period, year, now)
    ) {
      launchesByGame.set(gameId, st.launchCount || 0);
      totalLaunches += st.launchCount || 0;
    }
  }
  // Prefer session starts as launches when available for period windows
  if (period !== 'allTime') {
    const fromSessions = new Map<string, number>();
    for (const s of periodSessions) {
      fromSessions.set(s.gameId, (fromSessions.get(s.gameId) || 0) + 1);
    }
    if (fromSessions.size > 0) {
      launchesByGame.clear();
      totalLaunches = 0;
      for (const [id, c] of fromSessions) {
        launchesByGame.set(id, c);
        totalLaunches += c;
      }
    }
  }

  const rowFor = (gameId: string): StatsGameRow | null => {
    const game = gameMap.get(gameId);
    if (!game) return null;
    return {
      id: game.id,
      name: game.name,
      image: game.capsule || game.image || game.hero || '',
      launchCount: launchesByGame.get(gameId) || 0,
      sessionSec: sessionSecByGame.get(gameId) || launchStats[gameId]?.totalSessionSec || 0,
      playtimeMinutes: game.playtime || 0,
    };
  };

  const allIds = new Set([
    ...launchesByGame.keys(),
    ...sessionSecByGame.keys(),
    ...Object.keys(launchStats),
  ]);
  const rows: StatsGameRow[] = [];
  for (const id of allIds) {
    const r = rowFor(id);
    if (r) rows.push(r);
  }

  const topGamesByLaunches = [...rows]
    .filter((r) => r.launchCount > 0)
    .sort((a, b) => b.launchCount - a.launchCount)
    .slice(0, 8);

  const topGamesBySession = [...rows]
    .filter((r) => r.sessionSec > 0)
    .sort((a, b) => b.sessionSec - a.sessionSec)
    .slice(0, 8);

  const topGamesByPlaytime = [...rows]
    .filter((r) => r.playtimeMinutes > 0)
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)
    .slice(0, 8);

  const genreCounts = new Map<string, number>();
  for (const game of games) {
    for (const g of game.genres || []) {
      const name = g.trim();
      if (!name) continue;
      genreCounts.set(name, (genreCounts.get(name) || 0) + 1);
    }
  }
  const genreTotal = Array.from(genreCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const topGenres: StatsGenreRow[] = Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count, share: count / genreTotal }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const platformCounts = new Map<string, number>();
  for (const game of games) {
    platformCounts.set(game.platform || 'custom', (platformCounts.get(game.platform || 'custom') || 0) + 1);
  }
  const platformTotal = Array.from(platformCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const platforms: StatsPlatformRow[] = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count, share: count / platformTotal }))
    .sort((a, b) => b.count - a.count);

  const hourHistogram: StatsHourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));
  const weekdayBars: StatsWeekdayBucket[] = Array.from({ length: 7 }, (_, day) => ({
    day,
    count: 0,
    sessionSec: 0,
  }));
  for (const s of periodSessions) {
    const d = new Date(s.startedAt);
    hourHistogram[d.getHours()].count += 1;
    weekdayBars[d.getDay()].count += 1;
    weekdayBars[d.getDay()].sessionSec += s.durationSec || 0;
  }

  const totalSessionSec = periodSessions.reduce((a, s) => a + (s.durationSec || 0), 0);
  const totalSteamMinutes = games.reduce((sum, g) => sum + (g.playtime || 0), 0);
  const streakDays = computeStreakFromSessions(periodSessions, period, year, now);
  const mostDedicated = topGamesBySession[0] || topGamesByLaunches[0] || null;

  let favoriteCategory: QuarkStatsSnapshot['favoriteCategory'] = null;
  const cats = settings.customCategories || [];
  if (cats.length > 0) {
    const scored = cats.map((c) => {
      const ids = c.gameIds || [];
      const launches = ids.reduce((s, id) => s + (launchStats[id]?.launchCount || 0), 0);
      return { name: c.name, gameCount: ids.length, launches };
    });
    scored.sort((a, b) => b.launches - a.launches || b.gameCount - a.gameCount);
    favoriteCategory = { name: scored[0].name, gameCount: scored[0].gameCount };
  }

  const base: Omit<QuarkStatsSnapshot, 'insights'> = {
    period,
    generatedAt: now.toISOString(),
    year,
    totalLaunches,
    uniqueGamesLaunched: rows.filter((r) => r.launchCount > 0 || r.sessionSec > 0).length,
    totalSessionSec,
    totalSessionHours: Math.round((totalSessionSec / 3600) * 10) / 10,
    totalSteamMinutes,
    totalSteamHours: Math.round((totalSteamMinutes / 60) * 10) / 10,
    streakDays,
    topGamesByLaunches,
    topGamesBySession,
    topGamesByPlaytime,
    topGenres,
    platforms,
    recentSessions: [...periodSessions]
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, 40),
    hourHistogram,
    weekdayBars,
    mostDedicated,
    favoriteCategory,
  };

  return { ...base, insights: buildInsights(base, periodSessions) };
}

/** Compact payload for friend-visible sync (no raw sessions). */
export function buildPublicStatsSummary(
  snap: QuarkStatsSnapshot,
  showcase?: {
    motto?: string;
    favoriteGameName?: string;
    favoriteGameImage?: string;
  }
) {
  return {
    totals: {
      launches: snap.totalLaunches,
      sessionHours: snap.totalSessionHours,
      steamHours: snap.totalSteamHours,
      streakDays: snap.streakDays,
      uniqueGames: snap.uniqueGamesLaunched,
    },
    topGames: (snap.topGamesBySession.length ? snap.topGamesBySession : snap.topGamesByLaunches)
      .slice(0, 5)
      .map((g) => ({
        name: g.name,
        image: g.image || undefined,
        launchCount: g.launchCount,
        hours: Math.round((g.sessionSec / 3600) * 10) / 10 || undefined,
      })),
    topGenres: snap.topGenres.slice(0, 5).map((g) => ({ name: g.name, share: g.share })),
    showcase: showcase || undefined,
    updatedAt: snap.generatedAt,
  };
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}
