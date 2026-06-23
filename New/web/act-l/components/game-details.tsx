'use client';

import { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Game } from '@/lib/types';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { steamIntegration, SteamAchievement, SteamFriend } from '@/lib/steam-integration';
import { PlaytimeBadge } from '@/components/steam-profile';

interface GameDetailsProps {
  game: Game;
  onClose: () => void;
}

interface FriendPlaying {
  name: string;
  avatar?: string;
  playtime?: number;
  status: 'playing' | 'owns' | 'wishlist' | 'online' | 'offline';
}

export function GameDetails({ game, onClose }: GameDetailsProps) {
  const { launchGame, toggleFavorite } = useGames();
  const { isLoggedIn, settings, steamFriends } = useSettings();
  const { profile } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'friends'>('overview');
  
  // State for real achievements and friends
  const [achievements, setAchievements] = useState<SteamAchievement[]>([]);
  const [friendsPlaying, setFriendsPlaying] = useState<FriendPlaying[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  // Fetch achievements immediately when game details open (for Steam games)
  useEffect(() => {
    async function fetchAchievements() {
      console.log('[ACHIEVEMENTS] Checking conditions:');
      console.log('  - game.platform:', game.platform);
      console.log('  - steamApiKey:', settings.steamApiKey ? 'present' : 'missing');
      console.log('  - steamUserId:', settings.steamUserId || 'missing');
      console.log('  - game.id:', game.id);
      
      // Fetch achievements for Steam games immediately, not just when tab is active
      if (
        game.platform === 'steam' &&
        settings.steamApiKey &&
        settings.steamUserId
      ) {
        setIsLoadingAchievements(true);
        try {
          // Preferuj Electron API jeśli dostępne
          if (typeof window !== 'undefined' && window.electronAPI.steamGetAchievements) {
            console.log('[ACHIEVEMENTS] Using Electron API...');
            const result = await window.electronAPI.steamGetAchievements(
              settings.steamApiKey,
              settings.steamUserId,
              game.id
            );
            console.log('[ACHIEVEMENTS] Result:', result.success ? 'success' : 'failed', result.data?.length || 0, 'achievements');
            
            if (result.success && result.data) {
              // Dane z Electron API już mają poprawny format
              setAchievements(result.data.map((a: any) => ({
                apiname: a.apiname || '',
                name: a.name || a.apiname || '',
                description: a.description || '',
                achieved: a.achieved,
                unlocktime: a.unlocktime || 0,
                icon: a.icon || '',
                iconGray: a.iconGray || ''
              })));
            }
          } else if (profile?.steamId) {
            console.log('[ACHIEVEMENTS] Fallback to steam-integration...');
            // Fallback do steam-integration
            const appId = parseInt(game.id, 10);
            if (!isNaN(appId)) {
              const result = await steamIntegration.getPlayerAchievements(
                settings.steamApiKey,
                profile.steamId,
                appId
              );
              setAchievements(result);
            }
          } else {
            console.log('[ACHIEVEMENTS] No Electron API or profile steamId available');
          }
        } catch (error) {
          console.error('[ACHIEVEMENTS] Error fetching achievements:', error);
        } finally {
          setIsLoadingAchievements(false);
        }
      }
    }
    fetchAchievements();
  }, [game.id, game.platform, settings.steamApiKey, settings.steamUserId, profile?.steamId]);
  
  // Fetch friends who are playing this game
  useEffect(() => {
    async function fetchFriendsWithGame() {
      if (
        activeTab === 'friends' &&
        game.platform === 'steam' &&
        isLoggedIn &&
        settings.steamApiKey &&
        steamFriends.length > 0
      ) {
        setIsLoadingFriends(true);
        try {
          const appId = parseInt(game.id, 10);
          if (!isNaN(appId)) {
            const friendsWithGame: FriendPlaying[] = [];
            
            for (const friend of steamFriends) {
              // Check if friend is currently playing this game
              const isPlayingThis = friend.currentGame?.toLowerCase() === game.name.toLowerCase();
              
              // Only add friends who are actually playing this game
              if (isPlayingThis) {
                friendsWithGame.push({
                  name: friend.personaName,
                  avatar: friend.avatarUrl,
                  playtime: undefined,
                  status: 'playing'
                });
              }
            }
            
            setFriendsPlaying(friendsWithGame);
          }
        } catch (error) {
          console.error('Error fetching friends with game:', error);
        } finally {
          setIsLoadingFriends(false);
        }
      }
    }
    fetchFriendsWithGame();
  }, [activeTab, game.id, game.name, game.platform, isLoggedIn, settings.steamApiKey, steamFriends]);

  const handlePlay = () => {
    launchGame(game);
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

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Nieznany';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Nieznany';
    return new Date(timestamp * 1000).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const achievedCount = achievements.filter(a => a.achieved).length;
  const achievementProgress = achievements.length > 0 ? (achievedCount / achievements.length) * 100 : 0;

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
          {(game.background || game.hero) && (
            <img
              src={game.background || game.hero}
              alt={game.name}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-500',
                imageLoaded ? 'opacity-30' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 to-transparent" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-white/5">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
            Powrót
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleFavorite(game.id)}
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
                {(game.capsule || game.image) ? (
                  <img
                    src={game.capsule || game.image}
                    alt={game.name}
                    className="w-full rounded-xl shadow-2xl border border-white/10"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center">
                    <span className="text-4xl font-bold text-zinc-600">{game.name[0]}</span>
                  </div>
                )}
              </div>

              {/* Game Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-white">{game.name}</h1>
                    <PlaytimeBadge playtime={game.playtime} />
                  </div>
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
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold px-8 gap-2 shadow-lg shadow-violet-500/25"
                    onClick={handlePlay}
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Uruchom grę
                  </Button>

                  <Button variant="outline" className="gap-2 border-white/10 hover:bg-white/5" onClick={handleShowInStore}>
                    <ExternalLink className="h-4 w-4" />
                    Strona w sklepie
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 pt-4">
                  {game.playtime && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Clock className="h-4 w-4" />
                      <span>{Math.floor(game.playtime / 60)} godzin gry</span>
                    </div>
                  )}
                  {game.lastPlayed && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>Ostatnio uruchomione: {formatDate(new Date(game.lastPlayed).getTime())}</span>
                    </div>
                  )}
                  {game.sizeOnDisk && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <HardDrive className="h-4 w-4" />
                      <span>{formatBytes(game.sizeOnDisk)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Tabs for Overview / Achievements / Friends - pokazuj dla Steam jeśli mamy API key */}
            {game.platform === 'steam' && settings.steamApiKey && (
              <>
                <div className="flex gap-2">
                  {[
                    { id: 'overview', label: 'Przegląd', icon: null },
                    { id: 'achievements', label: 'Osiągnięcia', icon: Trophy },
                    { id: 'friends', label: 'Znajomi', icon: Users },
                  ].map(tab => (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-xl px-4 gap-2',
                        activeTab === tab.id && 'bg-white/10'
                      )}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    >
                      {tab.icon && <tab.icon className="h-4 w-4" />}
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {activeTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Osiągnięcia</h2>
                      <span className="text-sm text-zinc-400">
                        {isLoadingAchievements ? 'Ładowanie...' : `${achievedCount} / ${achievements.length}`}
                      </span>
                    </div>
                    <Progress value={achievementProgress} className="h-2" />
                    {isLoadingAchievements ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
                      </div>
                    ) : achievements.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 max-h-[70vh] overflow-y-auto pr-2">
                        {achievements.map(achievement => (
                          <div
                            key={achievement.apiname}
                            className={cn(
                              'p-3 rounded-xl border transition-all',
                              achievement.achieved
                                ? 'bg-yellow-500/10 border-yellow-500/30'
                                : 'bg-zinc-800/50 border-white/5 opacity-60'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {(achievement.achieved && achievement.icon) || (!achievement.achieved && achievement.iconGray) ? (
                                <img 
                                  src={achievement.achieved ? (achievement.icon || undefined) : (achievement.iconGray || undefined)} 
                                  alt="" 
                                  className="w-10 h-10 rounded-lg"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <div className={cn(
                                  'w-10 h-10 rounded-lg flex items-center justify-center',
                                  achievement.achieved ? 'bg-yellow-500/20' : 'bg-zinc-700'
                                )}>
                                  <Trophy className={cn(
                                    'h-5 w-5',
                                    achievement.achieved ? 'text-yellow-400' : 'text-zinc-500'
                                  )} />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-white text-sm">{achievement.name}</p>
                                <p className="text-xs text-zinc-500">{achievement.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">Brak osiągnięć dla tej gry lub nie można ich pobrać.</p>
                    )}
                  </div>
                )}

                {activeTab === 'friends' && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">Znajomi</h2>
                    {isLoadingFriends ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
                      </div>
                    ) : friendsPlaying.length > 0 ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {friendsPlaying.map(friend => (
                          <div
                            key={friend.name}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border",
                              friend.status === 'playing' 
                                ? 'bg-green-500/10 border-green-500/30' 
                                : friend.status === 'online'
                                  ? 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-zinc-800/50 border-white/5'
                            )}
                          >
                            <div className="relative">
                              {friend.avatar ? (
                                <img src={friend.avatar} alt="" className="w-10 h-10 rounded-full" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                                  <span className="text-white font-bold">{friend.name[0]}</span>
                                </div>
                              )}
                              {/* Status indicator */}
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900",
                                friend.status === 'playing' ? 'bg-green-500' :
                                friend.status === 'online' ? 'bg-blue-500' : 'bg-zinc-500'
                              )} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">{friend.name}</p>
                              <p className={cn(
                                "text-xs",
                                friend.status === 'playing' ? 'text-green-400' :
                                friend.status === 'online' ? 'text-blue-400' : 'text-zinc-500'
                              )}>
                                {friend.status === 'playing' ? 'Aktualnie gra' :
                                 friend.status === 'online' ? 'Online' : 'Offline'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">Żaden z twoich znajomych aktualnie nie gra w tę grę.</p>
                    )}
                  </div>
                )}

                {activeTab === 'overview' && (
                  <>
                    {/* Quick Stats Cards */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs uppercase">Czas gry</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {game.playtime ? `${Math.floor(game.playtime / 60)}h` : '0h'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs uppercase">Osiągnięcia</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {achievements.length > 0 ? `${achievedCount}/${achievements.length}` : '-'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                          <HardDrive className="h-4 w-4" />
                          <span className="text-xs uppercase">Rozmiar</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {formatBytes(game.sizeOnDisk)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs uppercase">Ostatnia aktualizacja</span>
                        </div>
                        <p className="text-xl font-bold text-white">
                          {game.lastUpdated ? formatDate(game.lastUpdated) : 'Nieznana'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">O grze</h2>
                      <p className="text-zinc-400 leading-relaxed max-w-3xl">
                        {game.description || `${game.name} to gra dostępna na platformie ${game.platform.toUpperCase()}. Uruchom grę, aby rozpocząć przygodę!`}
                      </p>
                    </div>

                    {/* Game Info Grid */}
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Platforma</h3>
                        <p className="text-white">{game.platform.toUpperCase()}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Status</h3>
                        <p className="text-green-400">{game.installed ? 'Zainstalowana' : 'Niezainstalowana'}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">ID gry</h3>
                        <p className="text-white font-mono text-sm">{game.id.length > 20 ? game.id.substring(0, 20) + '...' : game.id}</p>
                      </div>
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
                      {game.installDir && (
                        <div className="space-y-2 col-span-3">
                          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Folder instalacji</h3>
                          <p className="text-white font-mono text-sm truncate">{game.installDir}</p>
                        </div>
                      )}
                    </div>

                    {/* Genres */}
                    {game.genres && game.genres.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Gatunki</h3>
                        <div className="flex flex-wrap gap-2">
                          {game.genres.map((genre) => (
                            <Badge key={genre} className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Show overview for non-steam or Steam without API key */}
            {(game.platform !== 'steam' || !settings.steamApiKey) && (
              <>
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs uppercase">Czas gry</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {game.playtime ? `${Math.floor(game.playtime / 60)}h` : '0h'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Trophy className="h-4 w-4" />
                      <span className="text-xs uppercase">Osiągnięcia</span>
                    </div>
                    <p className="text-xl font-bold text-white">-</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <HardDrive className="h-4 w-4" />
                      <span className="text-xs uppercase">Rozmiar</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {formatBytes(game.sizeOnDisk)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase">Ostatnia aktualizacja</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {game.lastUpdated ? formatDate(game.lastUpdated) : 'Nieznana'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">O grze</h2>
                  <p className="text-zinc-400 leading-relaxed max-w-3xl">
                    {game.description || `${game.name} to gra dostępna na platformie ${game.platform.toUpperCase()}. Uruchom grę, aby rozpocząć przygodę!`}
                  </p>
                </div>

                {/* Game Info Grid */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Platforma</h3>
                    <p className="text-white">{game.platform.toUpperCase()}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Status</h3>
                    <p className="text-green-400">{game.installed ? 'Zainstalowana' : 'Niezainstalowana'}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">ID gry</h3>
                    <p className="text-white font-mono text-sm">{game.id.length > 20 ? game.id.substring(0, 20) + '...' : game.id}</p>
                  </div>
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
                  {game.installDir && (
                    <div className="space-y-2 col-span-3">
                      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Folder instalacji</h3>
                      <p className="text-white font-mono text-sm truncate">{game.installDir}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
