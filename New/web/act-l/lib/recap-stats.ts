import type { Game } from '@/lib/types';
import type { LaunchStatsMap } from '@/lib/play-history';
import type { AppSettings } from '@/lib/settings-context';

export type RecapPeriod = 'year' | 'allTime' | '30d';

export interface RecapGameRow {
  id: string;
  name: string;
  image: string;
  launchCount: number;
  playtimeMinutes: number;
  playtime2weeks?: number;
}

export interface RecapGenreRow {
  name: string;
  count: number;
  share: number;
}

export interface RecapPlatformRow {
  platform: string;
  count: number;
  share: number;
}

export interface QuarkRecapSnapshot {
  period: RecapPeriod;
  generatedAt: string;
  year: number;
  totalLaunches: number;
  uniqueGamesLaunched: number;
  totalSteamMinutes: number;
  totalSteamHours: number;
  topGamesByLaunches: RecapGameRow[];
  topGamesByPlaytime: RecapGameRow[];
  topGenres: RecapGenreRow[];
  platforms: RecapPlatformRow[];
  streakDays: number;
  mostDedicated: RecapGameRow | null;
  favoriteCategory: { name: string; gameCount: number } | null;
  recent2WeeksTop: RecapGameRow | null;
}

function inPeriod(iso: string | undefined, period: RecapPeriod, year: number, now: Date): boolean {
  if (!iso) return period === 'allTime';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (period === 'allTime') return true;
  if (period === 'year') return d.getFullYear() === year;
  if (period === '30d') {
    const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    return d.getTime() >= cutoff;
  }
  return true;
}

function computeStreak(stats: LaunchStatsMap, period: RecapPeriod, year: number, now: Date): number {
  const days = new Set<string>();
  for (const s of Object.values(stats)) {
    const iso = s.lastPlayed;
    if (!iso) continue;
    if (!inPeriod(iso, period, year, now)) continue;
    days.add(iso.slice(0, 10));
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

export function buildQuarkRecap(
  games: Game[],
  launchStats: LaunchStatsMap,
  settings: Pick<AppSettings, 'customCategories'>,
  period: RecapPeriod = 'allTime',
  now = new Date()
): QuarkRecapSnapshot {
  const year = now.getFullYear();
  const gameMap = new Map(games.map((g) => [g.id, g]));

  const rows: RecapGameRow[] = [];
  let totalLaunches = 0;

  for (const [gameId, stats] of Object.entries(launchStats)) {
    const game = gameMap.get(gameId);
    if (!game) continue;
    const relevant =
      period === 'allTime' ||
      inPeriod(stats.lastPlayed, period, year, now) ||
      inPeriod(stats.firstPlayed, period, year, now);
    if (!relevant) continue;
    const launchCount = stats.launchCount || 0;
    totalLaunches += launchCount;
    rows.push({
      id: game.id,
      name: game.name,
      image: game.capsule || game.image || game.hero || '',
      launchCount,
      playtimeMinutes: game.playtime || 0,
      playtime2weeks: game.playtime2weeks,
    });
  }

  if (period !== '30d') {
    for (const game of games) {
      if (rows.some((r) => r.id === game.id)) continue;
      if ((game.playtime || 0) <= 0) continue;
      rows.push({
        id: game.id,
        name: game.name,
        image: game.capsule || game.image || game.hero || '',
        launchCount: launchStats[game.id]?.launchCount || 0,
        playtimeMinutes: game.playtime || 0,
        playtime2weeks: game.playtime2weeks,
      });
    }
  }

  const topGamesByLaunches = [...rows]
    .filter((r) => r.launchCount > 0)
    .sort((a, b) => b.launchCount - a.launchCount)
    .slice(0, 5);

  const topGamesByPlaytime = [...rows]
    .filter((r) => r.playtimeMinutes > 0)
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)
    .slice(0, 5);

  const genreCounts = new Map<string, number>();
  for (const game of games) {
    for (const g of game.genres || []) {
      const name = g.trim();
      if (!name) continue;
      genreCounts.set(name, (genreCounts.get(name) || 0) + 1);
    }
  }
  const genreTotal = Array.from(genreCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const topGenres: RecapGenreRow[] = Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count, share: count / genreTotal }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const platformCounts = new Map<string, number>();
  for (const game of games) {
    const p = game.platform || 'custom';
    platformCounts.set(p, (platformCounts.get(p) || 0) + 1);
  }
  const platformTotal = Array.from(platformCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const platforms: RecapPlatformRow[] = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count, share: count / platformTotal }))
    .sort((a, b) => b.count - a.count);

  const totalSteamMinutes = games.reduce((sum, g) => sum + (g.playtime || 0), 0);
  const streakDays = computeStreak(launchStats, period, year, now);
  const mostDedicated = topGamesByLaunches[0] || topGamesByPlaytime[0] || null;

  let favoriteCategory: QuarkRecapSnapshot['favoriteCategory'] = null;
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

  const recent2WeeksTop =
    [...rows]
      .filter((r) => (r.playtime2weeks || 0) > 0)
      .sort((a, b) => (b.playtime2weeks || 0) - (a.playtime2weeks || 0))[0] || null;

  return {
    period,
    generatedAt: now.toISOString(),
    year,
    totalLaunches,
    uniqueGamesLaunched: rows.filter((r) => r.launchCount > 0).length,
    totalSteamMinutes,
    totalSteamHours: Math.round((totalSteamMinutes / 60) * 10) / 10,
    topGamesByLaunches,
    topGamesByPlaytime,
    topGenres,
    platforms,
    streakDays,
    mostDedicated,
    favoriteCategory,
    recent2WeeksTop,
  };
}

export function formatRecapShareText(snap: QuarkRecapSnapshot): string {
  const top = snap.topGamesByLaunches[0] || snap.topGamesByPlaytime[0];
  const lines = [
    `Quark Recap ${snap.period === 'year' ? snap.year : snap.period}`,
    `Uruchomienia: ${snap.totalLaunches} · Gry: ${snap.uniqueGamesLaunched}`,
    `Steam: ~${snap.totalSteamHours}h`,
    top ? `Top: ${top.name}` : null,
    snap.mostDedicated ? `Oddanie: ${snap.mostDedicated.name} (${snap.mostDedicated.launchCount}×)` : null,
    snap.streakDays > 0 ? `Streak: ${snap.streakDays} dni` : null,
    snap.topGenres[0] ? `Gatunek: ${snap.topGenres[0].name}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
