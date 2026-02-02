'use client';

import { useState, useEffect } from 'react';
import { 
  LogOut, 
  Users, 
  Trophy, 
  ExternalLink,
  Link2,
  Settings,
  X,
  Loader2,
  Calendar
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/lib/settings-context';
import { useGames } from '@/lib/games-context';
import { SteamFriend } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RecentAchievement {
  apiname: string;
  name: string;
  description: string;
  icon: string;
  unlocktime: number;
  appId: string;
  gameName: string;
}

interface SteamProfileProps {
  onOpenSteamIntegration?: () => void;
}

export function SteamProfile({ onOpenSteamIntegration }: SteamProfileProps) {
  const { steamUser, steamFriends, settings, logout } = useSettings();
  const { games } = useGames();
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [achievementsIsRecent, setAchievementsIsRecent] = useState(true);

  const onlineFriends = steamFriends.filter((f: SteamFriend) => f.isOnline);
  const offlineFriends = steamFriends.filter((f: SteamFriend) => !f.isOnline);

  // Sprawdź czy Steam jest połączony (przez lokalny system)
  const isSteamConnected = !!(steamUser && settings.steamApiKey && settings.steamUserId);

  // Pobierz ostatnie osiągnięcia gdy modal się otworzy
  useEffect(() => {
    if (isAchievementsModalOpen && isSteamConnected && recentAchievements.length === 0) {
      fetchRecentAchievements();
    }
  }, [isAchievementsModalOpen]);

  const fetchRecentAchievements = async () => {
    if (!settings.steamApiKey || !settings.steamUserId) return;
    
    setIsLoadingAchievements(true);
    try {
      const steamGames = games.filter(g => g.platform === 'steam');
      const appIds = steamGames.map(g => g.id);

      if (typeof window !== 'undefined' && window.electronAPI?.steamGetRecentAchievements) {
        const result = await window.electronAPI.steamGetRecentAchievements(
          settings.steamApiKey,
          settings.steamUserId,
          appIds
        );
        
        if (result.success && result.data) {
          setRecentAchievements(result.data);
          setAchievementsIsRecent(result.isRecent !== false);
        }
      }
    } catch (error) {
      console.error('Error fetching recent achievements:', error);
    } finally {
      setIsLoadingAchievements(false);
    }
  };

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

        <DropdownMenuItem 
          className="gap-2 cursor-pointer rounded-lg"
          onClick={() => setIsAchievementsModalOpen(true)}
        >
          <Trophy className="h-4 w-4 text-yellow-500" />
          Osiągnięcia
        </DropdownMenuItem>

        <DropdownMenuItem 
          className="gap-2 cursor-pointer rounded-lg"
          onClick={() => setIsFriendsModalOpen(true)}
        >
          <Users className="h-4 w-4 text-blue-400" />
          Wszyscy znajomi ({steamFriends.length})
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

      {/* Friends Modal */}
      <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Znajomi Steam ({steamFriends.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {/* Online Friends */}
            {onlineFriends.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
                  Online ({onlineFriends.length})
                </p>
                <div className="space-y-2">
                  {onlineFriends.map((friend: SteamFriend) => (
                    <div
                      key={friend.steamId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} alt={friend.personaName} />}
                          <AvatarFallback className="bg-zinc-800">{friend.personaName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 bg-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{friend.personaName}</p>
                        {friend.currentGame ? (
                          <p className="text-xs text-green-400 truncate">Gra w: {friend.currentGame}</p>
                        ) : (
                          <p className="text-xs text-green-400">Online</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Offline Friends */}
            {offlineFriends.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Offline ({offlineFriends.length})
                </p>
                <div className="space-y-2">
                  {offlineFriends.map((friend: SteamFriend) => (
                    <div
                      key={friend.steamId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 opacity-60">
                          {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} alt={friend.personaName} />}
                          <AvatarFallback className="bg-zinc-800">{friend.personaName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 bg-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-400 truncate">{friend.personaName}</p>
                        <p className="text-xs text-zinc-500">Offline</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {steamFriends.length === 0 && (
              <p className="text-zinc-500 text-center py-8">Brak znajomych do wyświetlenia</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Achievements Modal */}
      <Dialog open={isAchievementsModalOpen} onOpenChange={setIsAchievementsModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-zinc-900 border-zinc-800 max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {achievementsIsRecent ? 'Ostatnie osiągnięcia' : 'Ostatnio zdobyte'}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingAchievements ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mb-4" />
              <p className="text-zinc-400">Pobieranie osiągnięć...</p>
            </div>
          ) : recentAchievements.length > 0 ? (
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-3">
                {!achievementsIsRecent && (
                  <p className="text-xs text-zinc-500 text-center mb-2">
                    Brak osiągnięć z ostatnich 2 tygodni. Oto 3 ostatnio zdobyte:
                  </p>
                )}
                {recentAchievements.map((achievement, idx) => (
                  <div
                    key={`${achievement.appId}-${achievement.apiname}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                  >
                    {achievement.icon ? (
                      <img 
                        src={achievement.icon} 
                        alt="" 
                        className="w-12 h-12 rounded-lg"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-yellow-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{achievement.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{achievement.gameName}</p>
                      <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(achievement.unlocktime * 1000).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <Trophy className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-2">Brak ostatnich osiągnięć</p>
              <p className="text-zinc-500 text-sm">
                Graj w gry Steam, aby zdobywać osiągnięcia!
              </p>
            </div>
          )}
          
          <div className="pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.open(`https://steamcommunity.com/profiles/${settings.steamUserId}/stats/`, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Zobacz wszystkie osiągnięcia na Steam
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
