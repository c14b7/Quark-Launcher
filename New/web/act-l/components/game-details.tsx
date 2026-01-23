'use client';

import { useState } from 'react';
import { 
  Play, 
  Star, 
  Clock, 
  Calendar, 
  HardDrive, 
  ChevronLeft,
  Settings,
  Share2,
  ExternalLink,
  Trophy,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn, formatPlaytime, formatLastPlayed, formatBytes } from '@/lib/utils';
import { Game } from '@/lib/types';
import { useGames } from '@/lib/games-context';

interface GameDetailsProps {
  game: Game;
  onClose: () => void;
}

export function GameDetails({ game, onClose }: GameDetailsProps) {
  const { launchGame, toggleFavorite } = useGames();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handlePlay = () => {
    launchGame(game);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative flex-1 flex flex-col m-4 ml-[220px] rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl">
        {/* Hero Background */}
        <div className="absolute inset-0">
          <img
            src={game.background || game.hero}
            alt={game.name}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-500',
              imageLoaded ? 'opacity-30' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 to-transparent" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-white/5">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400 hover:text-white focus:ring-2 focus:ring-violet-500"
            onClick={onClose}
            aria-label="Zamknij szczegóły gry"
          >
            <ChevronLeft className="h-4 w-4" />
            Powrót
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 focus:ring-2 focus:ring-violet-500"
              onClick={() => toggleFavorite(game.id)}
              aria-label={game.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            >
              <Star className={cn(
                'h-4 w-4',
                game.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-400'
              )} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-4 w-4 text-zinc-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4 text-zinc-400" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="relative p-8 space-y-8">
            {/* Game Logo & Info */}
            <div className="flex items-end gap-8">
              {/* Game Capsule Image */}
              <div className="w-48 flex-shrink-0">
                <img
                  src={game.capsule || game.image}
                  alt={game.name}
                  className="w-full rounded-xl shadow-2xl border border-white/10"
                />
              </div>

              {/* Game Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{game.name}</h1>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-xs font-semibold',
                        game.platform === 'steam' && 'bg-blue-500/20 text-blue-400',
                        game.platform === 'xbox' && 'bg-green-500/20 text-green-400',
                        game.platform === 'epic' && 'bg-zinc-500/20 text-zinc-400'
                      )}
                    >
                      {game.platform.toUpperCase()}
                    </Badge>
                    {game.genres?.map((genre) => (
                      <Badge key={genre} variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Play Button */}
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold px-8 gap-2 shadow-lg shadow-violet-500/25 focus:ring-2 focus:ring-violet-400"
                    onClick={handlePlay}
                    aria-label={`Uruchom grę ${game.name}`}
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Uruchom grę
                  </Button>

                  <Button variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
                    <ExternalLink className="h-4 w-4" />
                    Strona w sklepie
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <Clock className="h-5 w-5 text-violet-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Czas gry</p>
                      <p className="text-sm font-semibold text-white">{formatPlaytime(game.playtime)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Ostatnio grane</p>
                      <p className="text-sm font-semibold text-white">{formatLastPlayed(game.lastPlayed)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <HardDrive className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Rozmiar</p>
                      <p className="text-sm font-semibold text-white">{formatBytes(game.sizeOnDisk)}</p>
                    </div>
                  </div>
                  
                  {game.sessions && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                      <Target className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Sesje</p>
                        <p className="text-sm font-semibold text-white">{game.sessions}</p>
                      </div>
                    </div>
                  )}
                  
                  {game.achievements && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Osiągnięcia</p>
                        <p className="text-sm font-semibold text-white">
                          {game.achievements.unlocked}/{game.achievements.total}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Description */}
            {game.description && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">O grze</h2>
                <p className="text-zinc-400 leading-relaxed max-w-3xl">
                  {game.description}
                </p>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-8">
              {game.developers && game.developers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Deweloper</h3>
                  <p className="text-white">{game.developers.join(', ')}</p>
                </div>
              )}
              {game.publishers && game.publishers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Wydawca</h3>
                  <p className="text-white">{game.publishers.join(', ')}</p>
                </div>
              )}
              {game.releaseDate && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Data wydania</h3>
                  <p className="text-white">{game.releaseDate}</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
