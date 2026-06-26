'use client';

import { MoreHorizontal, FolderOpen, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/lib/settings-context';
import { CategoryIcon } from '@/lib/category-icons';
import type { Game } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GameActionsMenuProps {
  game: Game;
  onHidden?: () => void;
}

export function GameActionsMenu({ game, onHidden }: GameActionsMenuProps) {
  const { settings, hideGame, addGameToCategory, removeGameFromCategory } = useSettings();
  const categories = settings.customCategories;

  const toggleCategory = (categoryId: string, checked: boolean) => {
    if (checked) addGameToCategory(categoryId, game.id);
    else removeGameFromCategory(categoryId, game.id);
  };

  const handleOpenFolder = async () => {
    if (game.installDir && typeof window !== 'undefined' && window.electronAPI?.openFolder) {
      await window.electronAPI.openFolder(game.installDir);
    }
  };

  const handleHide = () => {
    hideGame(game.id);
    onHidden?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-white"
          title="Opcje gry"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 bg-zinc-900/95 border-white/10 rounded-xl p-1 shadow-2xl"
      >
        <DropdownMenuLabel className="text-xs text-zinc-500 font-normal px-2 py-1.5">
          Dodaj do kategorii
        </DropdownMenuLabel>

        {categories.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-zinc-600 rounded-lg">
            Utwórz kategorię w Ustawieniach
          </DropdownMenuItem>
        ) : (
          categories.map((cat) => {
            const isIn = cat.gameIds.includes(game.id);
            return (
              <DropdownMenuCheckboxItem
                key={cat.id}
                checked={isIn}
                onCheckedChange={(checked) => toggleCategory(cat.id, checked)}
                className={cn(
                  'rounded-lg gap-2.5 py-2.5 cursor-pointer',
                  isIn && 'bg-violet-500/10 text-violet-200'
                )}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${cat.color}22` }}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} className="h-4 w-4" />
                </span>
                <span className="flex-1 truncate text-sm">{cat.name}</span>
                {isIn && <Check className="h-4 w-4 text-violet-400 shrink-0" />}
              </DropdownMenuCheckboxItem>
            );
          })
        )}

        <DropdownMenuSeparator className="bg-white/5 my-1" />

        {game.installDir && (
          <DropdownMenuItem onClick={handleOpenFolder} className="rounded-lg gap-2.5 py-2.5 cursor-pointer">
            <FolderOpen className="h-4 w-4 text-zinc-400" />
            Otwórz folder instalacji
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleHide} className="rounded-lg gap-2.5 py-2.5 cursor-pointer text-zinc-300">
          <EyeOff className="h-4 w-4 text-zinc-400" />
          Ukryj grę
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
