'use client';

import { Play, Star, HardDrive, EyeOff, Store, FolderPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { Game } from '@/lib/types';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { CategoryIcon } from '@/lib/category-icons';
import { PlaytimeBadge } from '@/components/steam-profile';
import { isMinecraftKind } from '@/lib/custom-games';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

function kindLabel(kind: string | undefined, t: (k: string) => string) {
  switch (kind) {
    case 'minecraft-java':
      return t('kindJava');
    case 'minecraft-bedrock':
      return t('kindBedrock');
    case 'minecraft-dungeons':
      return t('kindDungeons');
    case 'minecraft-legends':
      return t('kindLegends');
    case 'manual':
      return t('kindManual');
    default:
      return null;
  }
}

interface GameCardProps {
  game: Game;
  variant?: 'large' | 'medium' | 'small';
  onClick?: () => void;
  className?: string; // <-- Teraz interfejs oficjalnie akceptuje klasę zewnętrzną
}

export function GameCard({ game, variant = 'medium', onClick, className }: GameCardProps) {
  const t = useTranslations('library');
  const { toggleFavorite, launchGame } = useGames();
  const { hideGame, settings, addGameToCategory, removeGameFromCategory } = useSettings();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const badge = kindLabel(game.kind, t);

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

  const sizeClasses = {
    large: 'aspect-[21/9]',
    medium: 'aspect-[16/9]',
    small: 'aspect-[16/9]'
  };

  const imageUrl = imageError ? '' : (game.image || game.hero);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'relative rounded-2xl overflow-hidden cursor-pointer group',
            'bg-zinc-800/80 border border-white/5 shadow-sm',
            'transition-[transform,box-shadow,border-color] duration-200 ease-out',
            sizeClasses[variant],
            className
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
                  'w-full h-full object-cover transition-transform duration-500 ease-out',
                  isHovered ? 'scale-[1.03] brightness-[0.65]' : 'scale-100 brightness-90'
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

          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap max-w-[80%]">
            <PlaytimeBadge playtime={game.playtime} />
            {badge && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border backdrop-blur-md',
                  isMinecraftKind(game.kind)
                    ? 'bg-emerald-950/80 text-[#d4ff00] border-emerald-500/30'
                    : 'bg-black/60 text-zinc-200 border-white/10'
                )}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Content */}
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

              {/* Play Button */}
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
        {settings.customCategories.length > 0 ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 text-sm cursor-pointer rounded-lg">
              <FolderPlus className="h-4 w-4" />
              Kategoria
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-zinc-900/95 backdrop-blur-xl border-white/10 rounded-xl">
              {settings.customCategories.map((category) => {
                const inCategory = category.gameIds.includes(game.id);
                return (
                  <ContextMenuItem
                    key={category.id}
                    className="gap-2 text-sm cursor-pointer rounded-lg"
                    onClick={() => {
                      if (inCategory) removeGameFromCategory(category.id, game.id);
                      else addGameToCategory(category.id, game.id);
                    }}
                  >
                    <CategoryIcon icon={category.icon} color={category.color} className="h-3.5 w-3.5" />
                    <span className="flex-1">{category.name}</span>
                    {inCategory && <Check className="h-3.5 w-3.5 text-violet-400" />}
                  </ContextMenuItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : (
          <ContextMenuItem disabled className="gap-2 text-sm text-zinc-500 rounded-lg">
            <FolderPlus className="h-4 w-4" />
            {t('noCategories')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem 
          className="gap-2 text-sm cursor-pointer rounded-lg text-red-400 focus:text-red-400"
          onClick={handleHide}
        >
          <EyeOff className="h-4 w-4" />
          {t('hideGame')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}