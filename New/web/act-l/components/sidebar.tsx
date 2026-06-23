'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Home,
  Library,
  Settings,
  Search,
  ChevronRight,
  Gamepad2,
  Star,
  Bell,
  Command,
  Users,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useGames } from '@/lib/games-context';
import { Game } from '@/lib/types';
import { CardPost } from '@/components/side_banner';
import { useFriends } from '@/lib/friends-context';
import { useTranslations } from 'next-intl';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onGameSelect: (game: Game) => void;
  onOpenSettings?: () => void;
  onToggleFriends?: () => void;
  isFriendsOpen?: boolean;
}

export function Sidebar({
  currentView,
  onNavigate,
  onGameSelect,
  onOpenSettings,
  onToggleFriends,
  isFriendsOpen = true,
}: SidebarProps) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { games, searchQuery, setSearchQuery, filteredGames } = useGames();
  const { friends } = useFriends();
  const onlineCount = friends.filter((f) => f.presence === 'online').length;
  const [isGamesExpanded, setIsGamesExpanded] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'library', label: t('library'), icon: Library },
    { id: 'news', label: t('news'), icon: Bell },
    { id: 'store', label: t('store'), icon: Gamepad2 },
    { id: 'accounts', label: t('account'), icon: User },
  ];

  const sortedGames = [...(searchQuery ? filteredGames : games)].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });
  const displayedGames = sortedGames.filter((game) => !game.isHidden);

  return (
    <aside className="w-[240px] bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-violet-500" />
          <Input
            ref={searchInputRef}
            placeholder={tc('search')}
            className="pl-8 pr-12 h-9 bg-zinc-900/80 border-white/10 hover:border-white/20 text-xs placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:border-violet-500 transition-all rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-40 group-focus-within:opacity-0 transition-opacity pointer-events-none">
            <Command className="h-3 w-3" />
            <span className="text-[10px] font-medium tracking-tighter">K</span>
          </div>
        </div>
      </div>

      <nav className="px-2 py-1 space-y-0.5">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-2.5 h-9 text-xs font-medium transition-all rounded-xl',
              currentView === item.id
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            )}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Button>
        ))}
      </nav>

      <Separator className="my-2 bg-white/5" />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 rounded-lg mx-1 transition-colors flex-shrink-0"
          onClick={() => setIsGamesExpanded(!isGamesExpanded)}
        >
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            {t('yourGames', { count: displayedGames.length })}
          </span>
          <ChevronRight
            className={cn(
              'h-3 w-3 text-zinc-600 transition-transform',
              isGamesExpanded && 'rotate-90'
            )}
          />
        </div>

        {isGamesExpanded && (
          <div className="flex-1 overflow-hidden px-2">
            <ScrollArea className="h-full">
              <div className="space-y-0.5 pb-4 pr-2">
                {displayedGames.map((game) => (
                  <button
                    key={game.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group',
                      'hover:bg-white/5 text-zinc-400 hover:text-zinc-100'
                    )}
                    onClick={() => onGameSelect(game)}
                  >
                    <Avatar className="h-5 w-5 rounded-md ring-1 ring-white/5">
                      <AvatarImage src={game.image} alt={game.name} className="object-cover" />
                      <AvatarFallback className="text-[8px] bg-zinc-800">
                        {game.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] truncate flex-1 leading-tight">{game.name}</span>
                    {game.isFavorite && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 space-y-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 h-9 text-xs font-medium rounded-xl transition-all',
            isFriendsOpen
              ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
          )}
          onClick={onToggleFriends}
        >
          <Users className="h-4 w-4" />
          {t('friends')}
          {friends.length > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                'ml-auto h-4 px-1.5 text-[10px] border-0',
                isFriendsOpen ? 'bg-violet-500/30 text-violet-200' : 'bg-white/10 text-zinc-400'
              )}
            >
              {onlineCount > 0 ? t('online', { count: onlineCount }) : friends.length}
            </Badge>
          )}
        </Button>

        <CardPost />

        <div className="flex items-center justify-between pt-1">
          <Badge
            variant="secondary"
            className="bg-violet-500/10 text-violet-400/80 border border-violet-500/20 text-[10px] font-medium"
          >
            PRO
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10 rounded-xl"
            onClick={onOpenSettings}
            aria-label={tc('settings')}
          >
            <Settings className="h-4 w-4 text-zinc-400 hover:text-white transition-colors" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
