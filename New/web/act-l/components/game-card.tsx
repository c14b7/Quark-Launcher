'use client';

import { Play, Star, HardDrive, EyeOff, Store, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { Game } from '@/lib/types';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { PlaytimeBadge } from '@/components/steam-profile';
import { useState } from 'react';

interface GameCardProps {
  game: Game;
  variant?: 'large' | 'medium' | 'small';
  onClick?: () => void;
}

export function GameCard({ game, variant = 'medium', onClick }: GameCardProps) {
  const { toggleFavorite, launchGame } = useGames();
  const { hideGame } = useSettings();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    launchGame(game);
  };

  const handleFavorite = () => {
    toggleFavorite(game.id);
  };

  const handleHide = () => {
    hideGame(game.id);
  };

  const handleShowInStore = () => {
    if (game.platform === 'steam') {
      window.open(`https://store.steampowered.com/app/${game.id}`, '_blank');
    } else if (game.platform === 'epic') {
      // Epic Games Store doesn't have direct links by AppName, but we can try the general store
      window.open('https://store.epicgames.com/browse', '_blank');
    } else if (game.platform === 'xbox') {
      window.open(`https://www.xbox.com/games/store/${game.id}`, '_blank');
    }
  };

  const handleShowFiles = async () => {
    if (game.installDir && window.electronAPI) {
      try {
        await window.electronAPI.openFolder(game.installDir);
      } catch (err) {
        console.error('Failed to open folder:', err);
      }
    }
  };

  // Mniejsze kafelki
  const sizeClasses = {
    large: 'aspect-[21/9] min-h-[140px]',
    medium: 'aspect-[16/9] min-h-[80px]',
    small: 'aspect-[16/9] min-h-[60px]'
  };

  // Use header image for cards (better quality and always available)
  const imageUrl = imageError ? '' : (game.image || game.hero);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            'relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300',
            'bg-zinc-800/80 border border-white/5 shadow-md',
            'hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
            'hover:-translate-y-1 hover:z-10',
            sizeClasses[variant]
          )}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={game.name}
                className={cn(
                  'w-full h-full object-cover transition-transform duration-700 ease-out',
                  isHovered ? 'scale-110 brightness-[0.6]' : 'scale-105 brightness-90'
                )}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl font-black text-white/20 mb-3 tracking-tighter drop-shadow-sm">{game.name.substring(0, 2).toUpperCase()}</div>
                <div className="text-xs font-medium text-white/50 line-clamp-2 max-w-[80%]">{game.name}</div>
                {game.platform === 'epic' && (
                  <div className="mt-3 px-2 py-0.5 bg-zinc-800/80 border border-zinc-700 rounded-md">
                    <span className="text-[10px] text-white/70 font-semibold tracking-wider">EPIC GAMES</span>
                  </div>
                )}
              </div>
            )}
            {/* Gradient Overlay */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t transition-opacity duration-300",
              isHovered 
                ? "from-black/95 via-black/40 to-transparent opacity-100" 
                : "from-black/80 via-black/10 to-transparent opacity-80"
            )} />
          </div>

          {/* Favorite Star */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            {game.isFavorite && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
            )}
          </div>

          {/* Playtime Badge + Platform Badge - top left */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap max-w-[80%]">
            <PlaytimeBadge playtime={game.playtime} />
            
            {/* Platform Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-sm">
              {game.platform === 'steam' && (
                <svg className="h-3 w-3 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              )}
              {game.platform === 'epic' && (
                <svg className="h-3 w-3 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.48l7 3.5v6.84l-7-3.5V9.48zm16 0v6.84l-7 3.5v-6.84l7-3.5z"/>
                </svg>
              )}
              {game.platform === 'xbox' && (
                <svg className="h-3 w-3 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.96 11.96 0 0 0 7.902-2.967c1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417z"/>
                </svg>
              )}
              <span className="text-[9px] text-zinc-300 font-bold tracking-wider">{game.platform}</span>
            </div>
          </div>

          {/* Content - zawsze nazwa gry, nie logo */}
          <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end">
            <div className={cn(
              "transition-transform duration-300",
              isHovered ? "translate-y-0" : "translate-y-2"
            )}>
              <h3 className={cn(
                'font-bold text-white drop-shadow-md line-clamp-2 leading-tight',
                variant === 'large' ? 'text-2xl mb-3' : 'text-sm mb-2'
              )}>
                {game.name}
              </h3>

              {/* Play Button - appears on hover */}
              <div
                className={cn(
                  'flex items-center gap-2 transition-all duration-300',
                  isHovered ? 'opacity-100' : 'opacity-0'
                )}
              >
                <Button
                  size="sm"
                  className={cn(
                    'bg-white text-black hover:bg-zinc-200 font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)] gap-1.5 rounded-xl border border-white/20',
                    variant === 'large' ? 'h-10 px-6 text-sm' : 'h-8 px-4 text-xs'
                  )}
                  onClick={handlePlay}
                >
                  <Play className={cn('fill-current', variant === 'large' ? 'h-4 w-4' : 'h-3 w-3')} />
                  Uruchom
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52 bg-zinc-900/95 backdrop-blur-xl border-white/10 rounded-xl">
        <ContextMenuItem 
          className="gap-2 text-sm cursor-pointer rounded-lg"
          onClick={handlePlay}
        >
          <Play className="h-4 w-4" />
          Uruchom grę
        </ContextMenuItem>
        <ContextMenuItem 
          className="gap-2 text-sm cursor-pointer rounded-lg"
          onClick={handleFavorite}
        >
          <Star className={cn('h-4 w-4', game.isFavorite && 'fill-yellow-500 text-yellow-500')} />
          {game.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem 
          className="gap-2 text-sm cursor-pointer rounded-lg"
          onClick={handleShowInStore}
        >
          <Store className="h-4 w-4" />
          Pokaż w sklepie
        </ContextMenuItem>
        <ContextMenuItem 
          className="gap-2 text-sm cursor-pointer rounded-lg"
          onClick={handleShowFiles}
        >
          <HardDrive className="h-4 w-4" />
          Pokaż pliki
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem 
          className="gap-2 text-sm cursor-pointer rounded-lg text-red-400 focus:text-red-400"
          onClick={handleHide}
        >
          <EyeOff className="h-4 w-4" />
          Ukryj grę
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
