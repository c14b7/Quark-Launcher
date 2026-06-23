'use client';

import { GameCard } from '@/components/game-card';
import { GameRow, CarouselItem, CARD_WIDTH } from '@/components/game-row';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { Game } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Gamepad2, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogBanner } from './dialog_banner';
import { UpBanner } from './up_banner';
import { useTranslations } from 'next-intl';
import { CategoryIcon } from '@/lib/category-icons';

interface HomeViewProps {
  onGameSelect: (game: Game) => void;
}

export function HomeView({ onGameSelect }: HomeViewProps) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const { games, favoriteGames, isLoading, refreshGames, searchQuery, filteredGames, recentlyPlayedGames } = useGames();
  const { settings } = useSettings();

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
  const allGames = visibleGames.filter((g) => !featuredIds.has(g.id) && !recentIds.has(g.id));

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

        {settings.customCategories
          .filter((cat) => cat.gameIds.length > 0)
          .map((category) => {
            const catGames = visibleGames.filter((g) => category.gameIds.includes(g.id));
            if (catGames.length === 0) return null;
            return (
              <GameRow
                key={category.id}
                title={category.name}
                icon={<CategoryIcon icon={category.icon} color={category.color} />}
                count={catGames.length}
              >
                {catGames.map((game) => (
                  <CarouselItem key={game.id} className={CARD_WIDTH}>
                    <GameCard
                      game={game}
                      variant="medium"
                      onClick={() => onGameSelect(game)}
                      className="hover-game-card w-full"
                    />
                  </CarouselItem>
                ))}
              </GameRow>
            );
          })}

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
                <GameCard
                  game={game}
                  variant="medium"
                  onClick={() => onGameSelect(game)}
                  className="hover-game-card w-full"
                />
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
