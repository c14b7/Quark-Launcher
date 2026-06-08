'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { GameCard } from '@/components/game-card';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { Game } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Gamepad2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HomeViewProps {
  onGameSelect: (game: Game) => void;
}

export function HomeView({ onGameSelect }: HomeViewProps) {
  const { games, favoriteGames, isLoading, refreshGames, searchQuery, filteredGames } = useGames();
  const { settings } = useSettings();

  // Filtruj ukryte gry
  const visibleGames = (searchQuery ? filteredGames : games).filter(g => !settings.hiddenGames.includes(g.id));
  const visibleFavorites = favoriteGames.filter(g => !settings.hiddenGames.includes(g.id));

  // Top 3 favorite games for featured section (max 3) - only if not searching
  const featuredGames = !searchQuery 
    ? (visibleFavorites.length > 0 
      ? visibleFavorites.slice(0, 3) 
      : visibleGames.slice(0, 3))
    : [];

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
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-black/20 to-transparent">
      <ScrollArea className="flex-1 h-full">
        <div className="p-6 md:p-8 space-y-10 pb-24">
          {/* Featured Games - Large Cards - adaptacyjna szerokość */}
          {featuredGames.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-white/90 flex items-center gap-2 drop-shadow-md">
                <Star className="h-5 w-5 text-violet-500 fill-violet-500" />
                {visibleFavorites.length > 0 ? "Ulubione gry" : "Proponowane dla Ciebie"}
              </h2>
              <div className={cn('grid gap-4', getBannerGridClass())}>
                {featuredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    variant="large"
                    onClick={() => onGameSelect(game)}
                    className="hover-game-card" // <-- Płynna animacja podnoszenia dla dużych kart
                  />
                ))}
              </div>
            </section>
          )}

          {/* All Games Grid - mniejsze kafelki */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-white/90 flex items-center gap-2 mt-4 drop-shadow-md">
               <Gamepad2 className="h-5 w-5 text-zinc-400" />
               {searchQuery ? "Wyniki wyszukiwania" : "Biblioteka gier"} <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-1">{allGames.length}</span>
            </h2>
            {allGames.length === 0 && searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <p className="text-lg">Brak wyników dla "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
                {allGames.map((game, index) => (
                  <GameCard
                    key={`home-${game.id}-${index}`}
                    game={game}
                    variant="medium"
                    onClick={() => onGameSelect(game)}
                    className="hover-game-card" // <-- Płynna animacja podnoszenia dla reszty biblioteki
                  />
                ))}
              </div>
            )}
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