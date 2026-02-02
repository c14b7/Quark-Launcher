'use client';

import { useState } from 'react';
import {
  Home,
  Library,
  User,
  Settings,
  Search,
  ChevronRight,
  Gamepad2,
  Star,
  Download,
  Bell,
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
import { SteamProfile } from '@/components/steam-profile';
import { AIChatButton } from '@/components/ai-chat';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onGameSelect: (game: Game) => void;
  onOpenSettings?: () => void;
  onOpenChat?: () => void;
  onOpenSteamIntegration?: () => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Biblioteka', icon: Library },
 /*  { id: 'downloads', label: 'Pobieranie', icon: Download }, */
  { id: 'news', label: 'Aktualności', icon: Bell, badge: '3' },
 /*  { id: 'accounts', label: 'Połączone konta', icon: User }, */
  { id: 'store', label: 'Sklep', icon: Gamepad2 },
];

export function Sidebar({ currentView, onNavigate, onGameSelect, onOpenSettings, onOpenChat, onOpenSteamIntegration }: SidebarProps) {
  const { games, searchQuery, setSearchQuery, filteredGames } = useGames();
  const [isGamesExpanded, setIsGamesExpanded] = useState(true);

  // Sortuj gry: ulubione na górze, potem reszta
  const sortedGames = [...(searchQuery ? filteredGames : games)].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });
  // Filtruj ukryte gry
  const displayedGames = sortedGames.filter(game => !game.isHidden);

  return (
    <aside className="w-[240px] bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-full">
      {/* Steam Profile */}
      <div className="px-3 pt-3 pb-2">
        <SteamProfile onOpenSteamIntegration={onOpenSteamIntegration} />
      </div>

      <Separator className="bg-white/5 mx-3" />

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Szukaj gier..."
            className="pl-8 h-8 bg-zinc-900/50 border-white/5 text-xs placeholder:text-zinc-600 focus-visible:ring-violet-500/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-2 h-8 text-xs font-medium transition-all',
              currentView === item.id
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            )}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge && (
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] bg-violet-500/20 text-violet-400 border-0">
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </nav>

      <Separator className="my-2 bg-white/5" />

      {/* Your Games Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors flex-shrink-0"
          onClick={() => setIsGamesExpanded(!isGamesExpanded)}
        >
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Twoje gry ({displayedGames.length})
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
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all group',
                    'hover:bg-white/5 text-zinc-400 hover:text-white'
                  )}
                  onClick={() => onGameSelect(game)}
                >
                  <Avatar className="h-5 w-5 rounded">
                    <AvatarImage src={game.image} alt={game.name} className="object-cover" />
                    <AvatarFallback className="text-[8px] bg-zinc-800">
                      {game.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate flex-1">{game.name}</span>
                  {game.isFavorite && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {/* AI Chat Button */}
        <AIChatButton onClick={onOpenChat || (() => {})} />
        
        <Separator className="bg-white/5" />
        
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 border-0 text-[10px] font-semibold">
            PRO
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hover:bg-white/10 rounded-lg"
            onClick={onOpenSettings}
          >
            <Settings className="h-4 w-4 text-zinc-400 hover:text-white transition-colors" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
