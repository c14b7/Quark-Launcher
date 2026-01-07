'use client';

import { Play, Star, MoreHorizontal, HardDrive, EyeOff } from 'lucide-react';
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
            'relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-300',
            'bg-zinc-800/50 border border-white/5',
            'hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10',
            'hover:scale-[1.02] hover:z-10',
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
                  'w-full h-full object-cover transition-all duration-500',
                  isHovered && 'scale-105 brightness-75'
                )}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-zinc-600">{game.name[0]}</span>
              </div>
            )}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          </div>

          {/* Favorite Star */}
          {game.isFavorite && (
            <div className="absolute top-2 right-2 z-10">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
            </div>
          )}

          {/* Content - zawsze nazwa gry, nie logo */}
          <div className="absolute inset-0 p-3 flex flex-col justify-end">
            <div className="mb-1">
              <h3 className={cn(
                'font-bold text-white drop-shadow-lg line-clamp-2',
                variant === 'large' ? 'text-xl' : 'text-xs'
              )}>
                {game.name}
              </h3>
            </div>

            {/* Play Button - appears on hover */}
            <div
              className={cn(
                'flex items-center gap-2 transition-all duration-200',
                isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
            >
              <Button
                size="sm"
                className={cn(
                  'bg-white text-black hover:bg-white/90 font-semibold shadow-lg gap-1.5 rounded-lg',
                  variant === 'large' ? 'h-9 px-5' : 'h-6 px-3 text-xs'
                )}
                onClick={handlePlay}
              >
                <Play className={cn('fill-current', variant === 'large' ? 'h-4 w-4' : 'h-3 w-3')} />
                Graj
              </Button>
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
        <ContextMenuItem className="gap-2 text-sm cursor-pointer rounded-lg">
          <HardDrive className="h-4 w-4" />
          Pokaż pliki
        </ContextMenuItem>
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
