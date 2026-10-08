import type { Game } from '@/lib/types';
import type { Category } from '@/lib/settings-context';

/** Whitelisted genre rows for Home auto-categories (EN Steam tags → display). */
export const AUTO_GENRE_WHITELIST: { key: string; match: string[]; name: string; color: string; icon?: string }[] = [
  { key: 'action', match: ['Action', 'Shooter', 'FPS'], name: 'Action', color: '#ef4444', icon: 'swords' },
  { key: 'rpg', match: ['RPG', 'Role-Playing', 'JRPG'], name: 'RPG', color: '#8b5cf6', icon: 'sparkles' },
  { key: 'indie', match: ['Indie'], name: 'Indie', color: '#22c55e', icon: 'star' },
  { key: 'strategy', match: ['Strategy', 'Turn-Based Strategy', 'RTS'], name: 'Strategy', color: '#3b82f6', icon: 'map' },
  { key: 'adventure', match: ['Adventure'], name: 'Adventure', color: '#f59e0b', icon: 'compass' },
  { key: 'sim', match: ['Simulation', 'Sports', 'Racing'], name: 'Simulation', color: '#06b6d4', icon: 'gauge' },
  { key: 'horror', match: ['Horror', 'Survival Horror'], name: 'Horror', color: '#a855f7', icon: 'ghost' },
  { key: 'multiplayer', match: ['Multiplayer', 'Co-op', 'Online Co-Op', 'Massively Multiplayer'], name: 'Multiplayer', color: '#ec4899', icon: 'users' },
];

const MIN_GAMES = 2;
const GENRES_CACHE_KEY = 'quark-game-genres-cache';

export type AutoCategory = Category & {
  source: 'auto';
  autoKey: string;
  hidden?: boolean;
  pinned?: boolean;
  userTouched?: boolean;
};

export function slugGenre(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function loadGenresCache(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(GENRES_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveGenresCache(cache: Record<string, string[]>) {
  try {
    localStorage.setItem(GENRES_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function mergeGameGenres(games: Game[]): Game[] {
  const cache = loadGenresCache();
  return games.map((g) => {
    if (g.genres && g.genres.length > 0) {
      if (!cache[g.id]) {
        cache[g.id] = g.genres;
        saveGenresCache(cache);
      }
      return g;
    }
    const cached = cache[g.id];
    if (cached?.length) return { ...g, genres: cached };
    return g;
  });
}

/** Fetch Steam store genres for games missing them (rate-limited, best-effort). */
export async function enrichGenresFromSteamStore(
  games: Game[],
  limit = 12
): Promise<Record<string, string[]>> {
  const cache = loadGenresCache();
  const need = games.filter(
    (g) => g.platform === 'steam' && !(g.genres && g.genres.length) && !cache[g.id]
  );
  let fetched = 0;
  for (const g of need) {
    if (fetched >= limit) break;
    try {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(g.id)}&l=english`,
        { mode: 'cors' }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const entry = json?.[g.id];
      if (!entry?.success || !entry.data) continue;
      const genres: string[] = (entry.data.genres || [])
        .map((x: { description?: string }) => x.description)
        .filter(Boolean);
      if (genres.length) {
        cache[g.id] = genres;
        fetched += 1;
      }
      await new Promise((r) => setTimeout(r, 250));
    } catch {
      /* CORS may block in browser; Electron often allows */
    }
  }
  saveGenresCache(cache);
  return cache;
}

function matchesWhitelist(genres: string[], match: string[]): boolean {
  const lower = genres.map((g) => g.toLowerCase());
  return match.some((m) => lower.some((g) => g === m.toLowerCase() || g.includes(m.toLowerCase())));
}

/**
 * Rebuild auto categories from games. Preserves user flags (hidden/pinned/userTouched/name)
 * from previous auto categories with the same autoKey.
 */
export function rebuildAutoCategories(
  games: Game[],
  existing: Category[]
): Category[] {
  const prevAuto = existing.filter((c) => (c as AutoCategory).source === 'auto') as AutoCategory[];
  const prevByKey = new Map(prevAuto.map((c) => [c.autoKey, c]));
  const manual = existing.filter((c) => (c as AutoCategory).source !== 'auto');

  const generated: AutoCategory[] = [];
  for (const rule of AUTO_GENRE_WHITELIST) {
    const gameIds = games
      .filter((g) => matchesWhitelist(g.genres || [], rule.match))
      .map((g) => g.id);
    if (gameIds.length < MIN_GAMES) continue;

    const prev = prevByKey.get(rule.key);
    if (prev?.userTouched) {
      // Keep membership merge: union previous user list with auto matches unless hidden
      const merged = Array.from(new Set([...(prev.gameIds || []), ...gameIds]));
      generated.push({
        ...prev,
        gameIds: merged,
        source: 'auto',
        autoKey: rule.key,
      });
    } else {
      generated.push({
        id: prev?.id || `auto_${rule.key}`,
        name: prev?.name || rule.name,
        gameIds,
        color: prev?.color || rule.color,
        icon: prev?.icon || rule.icon,
        source: 'auto',
        autoKey: rule.key,
        hidden: prev?.hidden,
        pinned: prev?.pinned,
      });
    }
  }

  const pinned = generated.filter((c) => c.pinned && !c.hidden);
  const rest = generated.filter((c) => !c.pinned && !c.hidden);
  const hidden = generated.filter((c) => c.hidden);

  // Keep hidden autos in settings (so user can unhide) but Home filters them
  return [...manual, ...pinned, ...rest, ...hidden];
}

export function visibleHomeCategories(categories: Category[], showAuto: boolean): Category[] {
  return categories.filter((c) => {
    const ac = c as AutoCategory;
    if (ac.source === 'auto') {
      if (!showAuto) return false;
      if (ac.hidden) return false;
    }
    return (c.gameIds || []).length > 0;
  });
}
