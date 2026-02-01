'use client';

import { 
  LogOut, 
  Users, 
  Trophy, 
  ExternalLink,
  Link2,
  Settings
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/lib/settings-context';
import { SteamFriend } from '@/lib/types';

interface SteamProfileProps {
  onOpenSteamIntegration?: () => void;
}

export function SteamProfile({ onOpenSteamIntegration }: SteamProfileProps) {
  const { steamUser, steamFriends, settings, logout } = useSettings();

  const onlineFriends = steamFriends.filter((f: SteamFriend) => f.isOnline);

  // Sprawdź czy Steam jest połączony (przez lokalny system)
  const isSteamConnected = !!(steamUser && settings.steamApiKey && settings.steamUserId);

  // Nie połączony ze Steam
  if (!isSteamConnected) {
    return (
      <button 
        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors group"
        onClick={onOpenSteamIntegration}
      >
        <Avatar className="h-8 w-8 border-2 border-zinc-700">
          <AvatarFallback className="bg-zinc-800 text-zinc-500 text-xs">
            <Link2 className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-medium text-white truncate">
            Połącz konto
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-yellow-500">Steam niepołączony</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors group">
          <Avatar className="h-8 w-8 border-2 border-green-500/50">
            {steamUser?.avatarUrl && (
              <AvatarImage src={steamUser.avatarUrl} alt={steamUser.personaName || 'Steam'} />
            )}
            <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs">
              {steamUser?.personaName?.[0] || 'S'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {steamUser?.personaName || 'Steam User'}
            </p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-zinc-500">Połączono</span>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 bg-zinc-900/95 backdrop-blur-xl border-white/10 rounded-xl" align="start">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar className="h-10 w-10 border-2 border-green-500/50">
            {steamUser?.avatarUrl && (
              <AvatarImage src={steamUser.avatarUrl} alt={steamUser.personaName || 'Steam'} />
            )}
            <AvatarFallback className="bg-violet-500/20 text-violet-400">
              {steamUser?.personaName?.[0] || 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white">
              {steamUser?.personaName || 'Steam User'}
            </p>
            <p className="text-xs text-zinc-500 font-normal">
              Steam ID: ...{settings.steamUserId?.slice(-8)}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        {onlineFriends.length > 0 && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" />
                Znajomi online ({onlineFriends.length})
              </p>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {onlineFriends.slice(0, 5).map((friend: SteamFriend) => (
                <div
                  key={friend.steamId}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg mx-1"
                >
                  <Avatar className="h-6 w-6">
                    {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} alt={friend.personaName} />}
                    <AvatarFallback className="text-[10px] bg-zinc-800">{friend.personaName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{friend.personaName}</p>
                    {friend.currentGame && (
                      <p className="text-[10px] text-green-400 truncate">Gra w: {friend.currentGame}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
          </>
        )}

        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Osiągnięcia
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" asChild>
          <a 
            href={`https://steamcommunity.com/profiles/${settings.steamUserId}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Profil Steam
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem 
          className="gap-2 cursor-pointer rounded-lg"
          onClick={onOpenSteamIntegration}
        >
          <Settings className="h-4 w-4" />
          Zarządzaj integracją
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem 
          className="gap-2 cursor-pointer rounded-lg text-red-400 focus:text-red-400"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Rozłącz Steam
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlaytimeBadge({ playtime }: { playtime?: number }) {
  const hours = playtime ? Math.floor(playtime / 60) : 0;
  
  if (playtime === undefined || playtime === null) {
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
        Nowy
      </Badge>
    );
  }
  
  if (hours < 3) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
        Nowy
      </Badge>
    );
  }
  
  return null;
}
