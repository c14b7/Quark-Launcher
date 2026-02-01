'use client';

import { useState, useMemo } from 'react';
import { 
  Grid, 
  List, 
  SortAsc, 
  SortDesc, 
  Filter,
  Search,
  Star,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GameCard } from '@/components/game-card';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';

type SortOption = 'name' | 'lastPlayed' | 'playtime' | 'recent';
type FilterOption = 'all' | 'favorites' | 'installed' | 'steam' | 'xbox' | 'epic';

interface LibraryViewProps {
  onGameSelect: (game: Game) => void;
}

export function LibraryView({ onGameSelect }: LibraryViewProps) {
  const { games } = useGames();
  const { settings } = useSettings();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [localSearch, setLocalSearch] = useState('');

  const filteredAndSortedGames = useMemo(() => {
    // Najpierw filtruj ukryte gry
    let result = games.filter(g => !settings.hiddenGames.includes(g.id));

    // Apply filter
    switch (filter) {
      case 'favorites':
        result = result.filter(g => g.isFavorite);
        break;
      case 'installed':
        result = result.filter(g => g.installed);
        break;
      case 'steam':
        result = result.filter(g => g.platform === 'steam');
        break;
      case 'xbox':
        result = result.filter(g => g.platform === 'xbox');
        break;
      case 'epic':
        result = result.filter(g => g.platform === 'epic');
        break;
    }

    // Apply search
    if (localSearch) {
      result = result.filter(g => 
        g.name.toLowerCase().includes(localSearch.toLowerCase())
      );
    }

    // Apply sort
    result.sort((a, b) => {
      let aVal: string | number = a.name;
      let bVal: string | number = b.name;

      switch (sortBy) {
        case 'lastPlayed':
          aVal = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          bVal = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          break;
        case 'playtime':
          aVal = a.playtime || 0;
          bVal = b.playtime || 0;
          break;
        case 'recent':
          aVal = a.lastUpdated || 0;
          bVal = b.lastUpdated || 0;
          break;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [games, filter, localSearch, sortBy, sortOrder, settings.hiddenGames]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Biblioteka</h1>
          <Badge variant="secondary" className="bg-white/10 text-zinc-300 rounded-lg">
            {filteredAndSortedGames.length} gier
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Szukaj w bibliotece..."
              className="pl-9 h-9 bg-zinc-900/50 border-white/5 rounded-xl"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-white/10 rounded-xl">
                <Filter className="h-4 w-4" />
                Filtr
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10 rounded-xl">
              <DropdownMenuLabel>Filtruj według</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setFilter('all')}>
                Wszystkie gry
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('favorites')}>
                <Star className="h-4 w-4 mr-2" />
                Ulubione
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('installed')}>
                Zainstalowane
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setFilter('steam')}>
                Steam
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('xbox')}>
                Xbox
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('epic')}>
                Epic Games
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-white/10">
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                Sortuj
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10">
              <DropdownMenuLabel>Sortuj według</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Nazwa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('lastPlayed')}>
                <Clock className="h-4 w-4 mr-2" />
                Ostatnio grane
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('playtime')}>
                Czas gry
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                Ostatnio dodane
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={toggleSortOrder}>
                {sortOrder === 'asc' ? 'Rosnąco' : 'Malejąco'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode */}
          <div className="flex items-center border border-white/10 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 rounded-r-none', viewMode === 'grid' && 'bg-white/10')}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 rounded-l-none', viewMode === 'list' && 'bg-white/10')}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-4 pb-20">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredAndSortedGames.map((game, index) => (
                <GameCard
                  key={`library-grid-${game.id}-${index}`}
                  game={game}
                  variant="medium"
                  onClick={() => onGameSelect(game)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedGames.map((game, index) => (
                <GameListItem
                  key={`library-list-${game.id}-${index}`}
                  game={game}
                  onClick={() => onGameSelect(game)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface GameListItemProps {
  game: Game;
  onClick: () => void;
}

function GameListItem({ game, onClick }: GameListItemProps) {
  const { launchGame, toggleFavorite } = useGames();

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50 cursor-pointer transition-all group"
      onClick={onClick}
    >
      <img
        src={game.image}
        alt={game.name}
        className="w-20 h-10 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate">{game.name}</h3>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Badge variant="outline" className="text-[10px] border-zinc-700">
            {game.platform.toUpperCase()}
          </Badge>
          {game.playtime && (
            <span>{Math.floor(game.playtime / 60)}h gry</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(game.id);
          }}
        >
          <Star className={cn('h-4 w-4', game.isFavorite && 'fill-yellow-500 text-yellow-500')} />
        </Button>
        <Button
          size="sm"
          className="bg-violet-500 hover:bg-violet-600 text-white"
          onClick={(e) => {
            e.stopPropagation();
            launchGame(game);
          }}
        >
          Graj
        </Button>
      </div>
    </div>
  );
}
