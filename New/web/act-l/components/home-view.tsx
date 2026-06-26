'use client';

import { useMemo, useCallback } from 'react';
import { GameCard } from '@/components/game-card';
import { GameRow, CarouselItem, CARD_WIDTH } from '@/components/game-row';
import { DraggableCategoryRow } from '@/components/draggable-category-row';
import { SortableGameItem } from '@/components/sortable-game-item';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { Game } from '@/lib/types';
import { sortGamesByOrder, buildOrderFromGames } from '@/lib/game-order';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Gamepad2, Star, Clock, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogBanner } from './dialog_banner';
import { UpBanner } from './up_banner';
import { useTranslations } from 'next-intl';
import { CategoryIcon } from '@/lib/category-icons';

interface HomeViewProps {
  onGameSelect: (game: Game) => void;
  onOpenSettings?: (tab?: 'categories' | 'overlay') => void;
}

export function HomeView({ onGameSelect, onOpenSettings }: HomeViewProps) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const { games, favoriteGames, isLoading, refreshGames, searchQuery, filteredGames, recentlyPlayedGames } = useGames();
  const {
    settings,
    reorderCategories,
    reorderCategoryGames,
    reorderLibraryGames,
    setLibraryGameOrder,
  } = useSettings();

  const visibleGames = (searchQuery ? filteredGames : games).filter(
    (g) => !settings.hiddenGames.includes(g.id)
  );
  const visibleFavorites = favoriteGames.filter((g) => !settings.hiddenGames.includes(g.id));

  const recentlyPlayedVisible = recentlyPlayedGames.filter(
    (g) => !settings.hiddenGames.includes(g.id)
  );

  const featuredGames = !searchQuery
    ? visibleFavorites.length > 0
      ? visibleFavorites.slice(0, 3)
      : visibleGames.slice(0, 3)
    : [];

  const featuredIds = new Set(featuredGames.map((g) => g.id));
  const recentIds = new Set(recentlyPlayedVisible.map((g) => g.id));
  const allGamesRaw = visibleGames.filter((g) => !featuredIds.has(g.id) && !recentIds.has(g.id));

  const allGames = useMemo(
    () => sortGamesByOrder(allGamesRaw, settings.libraryGameOrder),
    [allGamesRaw, settings.libraryGameOrder]
  );

  const categoriesWithGames = useMemo(
    () =>
      settings.customCategories
        .map((category) => ({
          category,
          games: sortGamesByOrder(
            visibleGames.filter((g) => category.gameIds.includes(g.id)),
            category.gameIds
          ),
        }))
        .filter((entry) => entry.games.length > 0),
    [settings.customCategories, visibleGames]
  );

  const handleAllGamesReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const ids = settings.libraryGameOrder?.length
        ? [...settings.libraryGameOrder]
        : buildOrderFromGames(allGames);
      const fromId = allGames[fromIndex]?.id;
      const toId = allGames[toIndex]?.id;
      if (!fromId || !toId) return;
      const fromOrder = ids.indexOf(fromId);
      const toOrder = ids.indexOf(toId);
      if (fromOrder < 0 || toOrder < 0) {
        const base = buildOrderFromGames(allGames);
        setLibraryGameOrder(
          base.map((id, i) => {
            if (i === fromIndex) return base[toIndex];
            if (i === toIndex) return base[fromIndex];
            return id;
          })
        );
        return;
      }
      reorderLibraryGames(fromOrder, toOrder);
    },
    [allGames, reorderLibraryGames, setLibraryGameOrder, settings.libraryGameOrder]
  );

  const handleCategoryGamesReorder = useCallback(
    (categoryId: string, gamesInCat: Game[], fromIndex: number, toIndex: number) => {
      const category = settings.customCategories.find((c) => c.id === categoryId);
      if (!category) return;
      const ids = category.gameIds.length ? [...category.gameIds] : buildOrderFromGames(gamesInCat);
      const fromId = gamesInCat[fromIndex]?.id;
      const toId = gamesInCat[toIndex]?.id;
      if (!fromId || !toId) return;
      const fromOrder = ids.indexOf(fromId);
      const toOrder = ids.indexOf(toId);
      if (fromOrder < 0 || toOrder < 0) return;
      reorderCategoryGames(categoryId, fromOrder, toOrder);
    },
    [reorderCategoryGames, settings.customCategories]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (visibleGames.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500">
        <Gamepad2 className="h-16 w-16 text-zinc-700" />
        <p className="text-lg">{t('noGames')}</p>
        <p className="text-sm text-zinc-600">{t('steamHint')}</p>
        <Button
          onClick={refreshGames}
          variant="outline"
          className="gap-2 mt-4 border-zinc-700 hover:bg-zinc-800 rounded-xl"
        >
          <RefreshCw className="h-4 w-4" />
          {tc('refresh')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-black/20 to-transparent">
      <div className="content-shell space-y-8 pb-24">
        <UpBanner />
        <DialogBanner />

        {featuredGames.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-white/90 flex items-center gap-2">
              <Star className="h-4 w-4 text-violet-500 fill-violet-500" />
              {visibleFavorites.length > 0 ? t('favorites') : t('featured')}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {featuredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  variant="large"
                  onClick={() => onGameSelect(game)}
                  className="hover-game-card featured-banner"
                />
              ))}
            </div>
          </section>
        )}

        {!searchQuery && recentlyPlayedVisible.length > 0 && (
          <GameRow
            title={t('recentlyPlayed')}
            icon={<Clock className="h-5 w-5 text-cyan-400 shrink-0" />}
            count={recentlyPlayedVisible.length}
          >
            {recentlyPlayedVisible.map((game) => (
              <CarouselItem key={`recent-${game.id}`} className={CARD_WIDTH}>
                <GameCard
                  game={game}
                  variant="medium"
                  onClick={() => onGameSelect(game)}
                  className="hover-game-card w-full"
                />
              </CarouselItem>
            ))}
          </GameRow>
        )}

        {!searchQuery && settings.customCategories.length === 0 && (
          <section className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 p-8 flex flex-col items-center justify-center text-center gap-3">
            <FolderPlus className="h-10 w-10 text-zinc-600" />
            <h2 className="text-lg font-semibold text-zinc-300">{t('noCategories')}</h2>
            <p className="text-sm text-zinc-500 max-w-sm">{t('noCategoriesHint')}</p>
            {onOpenSettings && (
              <Button
                variant="outline"
                className="mt-2 rounded-xl border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                onClick={() => onOpenSettings('categories')}
              >
                {t('addCategory')}
              </Button>
            )}
          </section>
        )}

        {!searchQuery &&
          categoriesWithGames.map(({ category, games: catGames }, categoryIndex) => (
            <DraggableCategoryRow
              key={category.id}
              categoryId={category.id}
              categoryIndex={categoryIndex}
              title={category.name}
              icon={<CategoryIcon icon={category.icon} color={category.color} />}
              count={catGames.length}
              onCategoryReorder={reorderCategories}
            >
              {catGames.map((game, gameIndex) => (
                <CarouselItem key={game.id} className={CARD_WIDTH}>
                  <SortableGameItem
                    id={game.id}
                    index={gameIndex}
                    className="w-full"
                    onReorder={(from, to) =>
                      handleCategoryGamesReorder(category.id, catGames, from, to)
                    }
                  >
                    <GameCard
                      game={game}
                      variant="medium"
                      onClick={() => onGameSelect(game)}
                      className="hover-game-card w-full"
                    />
                  </SortableGameItem>
                </CarouselItem>
              ))}
            </DraggableCategoryRow>
          ))}

        <GameRow
          title={searchQuery ? t('searchResults') : t('library')}
          icon={<Gamepad2 className="h-5 w-5 text-zinc-400" />}
          count={allGames.length}
        >
          {allGames.length === 0 && searchQuery ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 w-full min-w-full">
              <p className="text-lg">{t('noSearchResults', { query: searchQuery })}</p>
            </div>
          ) : (
            allGames.map((game, index) => (
              <CarouselItem key={`home-${game.id}-${index}`} className={CARD_WIDTH}>
                <SortableGameItem
                  id={game.id}
                  index={index}
                  enabled={!searchQuery}
                  className="w-full"
                  onReorder={handleAllGamesReorder}
                >
                  <GameCard
                    game={game}
                    variant="medium"
                    onClick={() => onGameSelect(game)}
                    className="hover-game-card w-full"
                  />
                </SortableGameItem>
              </CarouselItem>
            ))
          )}
        </GameRow>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 p-5 space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[21/9] max-h-[120px] rounded-xl bg-zinc-800" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="w-44 aspect-[16/9] rounded-xl bg-zinc-800 shrink-0" />
        ))}
      </div>
    </div>
  );
}
