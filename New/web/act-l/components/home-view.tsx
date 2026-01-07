'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { GameCard } from '@/components/game-card';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { Game } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HomeViewProps {
  onGameSelect: (game: Game) => void;
}

export function HomeView({ onGameSelect }: HomeViewProps) {
  const { games, favoriteGames, isLoading, refreshGames } = useGames();
  const { settings } = useSettings();

  // Filtruj ukryte gry
  const visibleGames = games.filter(g => !settings.hiddenGames.includes(g.id));
  const visibleFavorites = favoriteGames.filter(g => !settings.hiddenGames.includes(g.id));

  // Top 3 favorite games for featured section (max 3)
  const featuredGames = visibleFavorites.length > 0 
    ? visibleFavorites.slice(0, 3) 
    : visibleGames.slice(0, 3);

  // Rest of the games
  const allGames = visibleGames.filter(g => !featuredGames.find(f => f.id === g.id));

  // Dynamiczna siatka dla banerów - adaptacyjna szerokość
  const getBannerGridClass = () => {
    const count = featuredGames.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (visibleGames.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500">
        <Gamepad2 className="h-16 w-16 text-zinc-700" />
        <p className="text-lg">Nie znaleziono gier</p>
        <p className="text-sm text-zinc-600">Upewnij się, że Steam jest zainstalowany</p>
        <Button 
          onClick={refreshGames} 
          variant="outline" 
          className="gap-2 mt-4 border-zinc-700 hover:bg-zinc-800 rounded-xl"
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 h-full">
        <div className="p-5 space-y-5 pb-24">
          {/* Featured Games - Large Cards - adaptacyjna szerokość */}
          {featuredGames.length > 0 && (
            <section>
              <div className={cn('grid gap-3', getBannerGridClass())}>
                {featuredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    variant="large"
                    onClick={() => onGameSelect(game)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All Games Grid - mniejsze kafelki */}
          <section>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
              {allGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  variant="medium"
                  onClick={() => onGameSelect(game)}
                />
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 p-5 space-y-6">
      {/* Featured skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[21/9] rounded-xl bg-zinc-800" />
        ))}
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-7 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => (
          <Skeleton key={i} className="aspect-[16/9] rounded-xl bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
