'use client';

import { useState } from 'react';
import { 
  LogIn, 
  LogOut, 
  Users, 
  Trophy, 
  ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { SteamUser, SteamFriend } from '@/lib/types';

// Mock Steam login for demo (in production, this would use Steam OpenID)
const mockSteamUsers: SteamUser[] = [
  {
    steamId: '76561198012345678',
    personaName: 'QuarkGamer',
    avatarUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
    avatarMediumUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
    avatarFullUrl: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    profileUrl: 'https://steamcommunity.com/id/quarkgamer',
    isOnline: true,
    countryCode: 'PL'
  }
];

const mockFriends: SteamFriend[] = [
  {
    steamId: '76561198087654321',
    personaName: 'ProGamer2024',
    avatarUrl: 'https://avatars.steamstatic.com/b5bd56c1aa4644a474a2e4972be27ef9e82e517e.jpg',
    isOnline: true,
    currentGame: 'Counter-Strike 2'
  },
  {
    steamId: '76561198098765432',
    personaName: 'NightOwl',
    avatarUrl: 'https://avatars.steamstatic.com/1c1f8e5a79ae71f9c8c47fca1c8e8a79d2e94dc2.jpg',
    isOnline: true,
    currentGame: 'Elden Ring'
  },
  {
    steamId: '76561198076543210',
    personaName: 'CasualPlayer',
    avatarUrl: 'https://avatars.steamstatic.com/d2a1b3c4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0.jpg',
    isOnline: false
  }
];

export function SteamProfile() {
  const { steamUser, setSteamUser, steamFriends, setSteamFriends, isLoggedIn, logout } = useSettings();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    
    // Simulate Steam OAuth login delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, this would redirect to Steam OpenID
    // For demo, we use mock data
    setSteamUser(mockSteamUsers[0]);
    setSteamFriends(mockFriends);
    
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    logout();
  };

  const onlineFriends = steamFriends.filter(f => f.isOnline);

  if (!isLoggedIn) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl"
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        <LogIn className="h-4 w-4" />
        {isLoggingIn ? 'Logowanie...' : 'Zaloguj przez Steam'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors group">
          <Avatar className="h-8 w-8 border-2 border-green-500/50">
            <AvatarImage src={steamUser?.avatarUrl} alt={steamUser?.personaName} />
            <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
              {steamUser?.personaName?.[0] || 'S'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-medium text-white truncate">{steamUser?.personaName}</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-zinc-500">Online</span>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 bg-zinc-900/95 backdrop-blur-xl border-white/10 rounded-xl" align="start">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar className="h-10 w-10 border-2 border-green-500/50">
            <AvatarImage src={steamUser?.avatarMediumUrl} alt={steamUser?.personaName} />
            <AvatarFallback className="bg-blue-500/20 text-blue-400">
              {steamUser?.personaName?.[0] || 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white">{steamUser?.personaName}</p>
            <p className="text-xs text-zinc-500 font-normal">Steam ID: {steamUser?.steamId?.slice(-8)}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" />
                Znajomi online ({onlineFriends.length})
              </p>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {onlineFriends.slice(0, 5).map(friend => (
                <div
                  key={friend.steamId}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg mx-1"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={friend.avatarUrl} alt={friend.personaName} />
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
          <a href={steamUser?.profileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Profil Steam
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem 
          className="gap-2 cursor-pointer rounded-lg text-red-400 focus:text-red-400"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Playtime badge component
export function PlaytimeBadge({ playtime }: { playtime?: number }) {
  // playtime is in minutes
  const hours = playtime ? Math.floor(playtime / 60) : 0;
  
  if (playtime === undefined || playtime === null) {
    // Never played - blue badge
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
        Nowy
      </Badge>
    );
  }
  
  if (hours < 3) {
    // Less than 3 hours - yellow badge
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
        Nowy
      </Badge>
    );
  }
  
  // Played more than 3 hours - no badge
  return null;
}
