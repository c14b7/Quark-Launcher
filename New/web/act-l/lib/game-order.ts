import type { Game } from '@/lib/types';

export function sortGamesByOrder(games: Game[], orderIds?: string[]): Game[] {
  if (!orderIds?.length) return games;
  const rank = new Map(orderIds.map((id, i) => [id, i]));
  return [...games].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

export function reorderIds(ids: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return ids;
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function buildOrderFromGames(games: Game[]): string[] {
  return games.map((g) => g.id);
}
