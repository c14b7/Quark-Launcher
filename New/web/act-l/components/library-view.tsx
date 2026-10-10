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
  Clock,
  Plus
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
import { AddGameDialog } from '@/components/add-game-dialog';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { CategoryIcon } from '@/lib/category-icons';
import { Game } from '@/lib/types';
import { isMinecraftKind } from '@/lib/custom-games';
import { SortableGameItem } from '@/components/sortable-game-item';
import { sortGamesByOrder, buildOrderFromGames, reorderIds } from '@/lib/game-order';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type SortOption = 'name' | 'lastPlayed' | 'playtime' | 'recent' | 'custom';
type FilterOption =
  | 'all'
  | 'favorites'
  | 'installed'
  | 'steam'
  | 'xbox'
  | 'epic'
  | 'custom'
  | 'minecraft'
  | string;

interface LibraryViewProps {
  onGameSelect: (game: Game) => void;
}

export function LibraryView({ onGameSelect }: LibraryViewProps) {
  const t = useTranslations('library');
  const { games, refreshGames } = useGames();
  const { settings, setLibraryGameOrder } = useSettings();
  const hasDismissedDetected = (settings.dismissedDetectedGameIds || []).length > 0;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>(settings.librarySortBy || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const categoryFilters = settings.customCategories.filter((c) => c.gameIds.length > 0);

  const filteredAndSortedGames = useMemo(() => {
    let result = games.filter((g) => !settings.hiddenGames.includes(g.id));

    const categoryMatch = settings.customCategories.find((c) => c.id === filter);
    if (categoryMatch) {
      result = result.filter((g) => categoryMatch.gameIds.includes(g.id));
    } else {
      switch (filter) {
        case 'favorites':
          result = result.filter((g) => g.isFavorite);
          break;
        case 'installed':
          result = result.filter((g) => g.installed);
          break;
        case 'steam':
          result = result.filter((g) => g.platform === 'steam');
          break;
        case 'xbox':
          result = result.filter((g) => g.platform === 'xbox');
          break;
        case 'epic':
          result = result.filter((g) => g.platform === 'epic');
          break;
        case 'custom':
          result = result.filter((g) => g.platform === 'custom');
          break;
        case 'minecraft':
          result = result.filter((g) => isMinecraftKind(g.kind));
          break;
      }
    }

    // Apply search
    if (localSearch) {
      result = result.filter(g => 
        g.name.toLowerCase().includes(localSearch.toLowerCase())
      );
    }

    // Apply sort
    if (sortBy === 'custom' && settings.libraryGameOrder?.length) {
      result = sortGamesByOrder(result, settings.libraryGameOrder);
    } else {
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
    }

    return result;
  }, [games, filter, localSearch, sortBy, sortOrder, settings.hiddenGames, settings.customCategories, settings.libraryGameOrder]);

  const handleLibraryReorder = (fromIndex: number, toIndex: number) => {
    const ids = settings.libraryGameOrder?.length
      ? [...settings.libraryGameOrder]
      : buildOrderFromGames(filteredAndSortedGames);
    const visibleIds = filteredAndSortedGames.map((g) => g.id);
    const fromId = visibleIds[fromIndex];
    const toId = visibleIds[toIndex];
    if (!fromId || !toId) return;
    let order = ids.filter((id) => visibleIds.includes(id));
    for (const id of visibleIds) {
      if (!order.includes(id)) order.push(id);
    }
    const fromOrder = order.indexOf(fromId);
    const toOrder = order.indexOf(toId);
    if (fromOrder < 0 || toOrder < 0) return;
    setLibraryGameOrder(reorderIds(order, fromOrder, toOrder));
    setSortBy('custom');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">{t('title')}</h1>
          <Badge variant="secondary" className="bg-white/10 text-zinc-300 rounded-lg">
            {t('gamesCount', { count: filteredAndSortedGames.length })}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 rounded-xl bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t('addGame')}
          </Button>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder={t('searchPlaceholder')}
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
                {t('filter')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10 rounded-xl">
              <DropdownMenuLabel>{t('filter')}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setFilter('all')}>
                {t('filterAll')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('favorites')}>
                <Star className="h-4 w-4 mr-2" />
                {t('filterFavorites')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('installed')}>
                {t('filterInstalled')}
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
              <DropdownMenuItem onClick={() => setFilter('custom')}>
                {t('filterCustom')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('minecraft')}>
                {t('filterMinecraft')}
              </DropdownMenuItem>
              {categoryFilters.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel>Kategorie</DropdownMenuLabel>
                  {categoryFilters.map((category) => (
                    <DropdownMenuItem key={category.id} onClick={() => setFilter(category.id)}>
                      <CategoryIcon icon={category.icon} color={category.color} className="h-3.5 w-3.5 mr-2" />
                      {category.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
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
              <DropdownMenuItem onClick={() => setSortBy('custom')}>
                Własna kolejność (przeciąganie)
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

      {/* Category chips */}
      {categoryFilters.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto carousel-scroll flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'shrink-0 h-8 rounded-full text-xs border',
              filter === 'all'
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'border-white/10 text-zinc-400 hover:text-white'
            )}
            onClick={() => setFilter('all')}
          >
            Wszystkie
          </Button>
          {categoryFilters.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              size="sm"
              className={cn(
                'shrink-0 h-8 rounded-full text-xs border gap-1.5',
                filter === category.id
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                  : 'border-white/10 text-zinc-400 hover:text-white'
              )}
              onClick={() => setFilter(category.id)}
            >
              <CategoryIcon icon={category.icon} color={category.color} className="h-3 w-3" />
              {category.name}
              <span className="opacity-60">({category.gameIds.length})</span>
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-4 pb-20">
          {filter === 'minecraft' && hasDismissedDetected && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2">
              <p className="text-xs text-zinc-400">{t('restoreDetectedHint')}</p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-white/10 rounded-xl text-xs"
                onClick={() => void refreshGames({ restoreDetected: true })}
              >
                {t('restoreDetected')}
              </Button>
            </div>
          )}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredAndSortedGames.map((game, index) => (
                <SortableGameItem
                  key={`library-grid-${game.id}-${index}`}
                  id={game.id}
                  index={index}
                  enabled
                  onReorder={handleLibraryReorder}
                >
                  <GameCard
                    game={game}
                    variant="medium"
                    onClick={() => onGameSelect(game)}
                  />
                </SortableGameItem>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedGames.map((game, index) => (
                <SortableGameItem
                  key={`library-list-${game.id}-${index}`}
                  id={game.id}
                  index={index}
                  enabled
                  onReorder={handleLibraryReorder}
                >
                  <GameListItem
                    game={game}
                    onClick={() => onGameSelect(game)}
                  />
                </SortableGameItem>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <AddGameDialog open={addOpen} onOpenChange={setAddOpen} />
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
