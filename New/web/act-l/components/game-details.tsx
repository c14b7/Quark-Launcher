'use client';

import { useState } from 'react';
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
import { PlaytimeBadge } from '@/components/steam-profile';

interface GameDetailsProps {
  game: Game;
  onClose: () => void;
}

// Mock achievements for demo
const mockAchievements = [
  { id: '1', name: 'Pierwszy krok', description: 'Ukończ samouczek', achieved: true, iconUrl: '' },
  { id: '2', name: 'Odkrywca', description: 'Odwiedź wszystkie lokacje', achieved: true, iconUrl: '' },
  { id: '3', name: 'Mistro walki', description: 'Pokonaj 100 wrogów', achieved: false, iconUrl: '' },
  { id: '4', name: 'Kolekcjoner', description: 'Zbierz wszystkie przedmioty', achieved: false, iconUrl: '' },
];

// Mock friends playing
const mockFriendsPlaying = [
  { name: 'ProGamer2024', playtime: 45 },
  { name: 'NightOwl', playtime: 120 },
];

export function GameDetails({ game, onClose }: GameDetailsProps) {
  const { launchGame, toggleFavorite } = useGames();
  const { isLoggedIn } = useSettings();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'friends'>('overview');

  const handlePlay = () => {
    launchGame(game);
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

  const achievedCount = mockAchievements.filter(a => a.achieved).length;
  const achievementProgress = (achievedCount / mockAchievements.length) * 100;

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
          <img
            src={game.background || game.hero}
            alt={game.name}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-500',
              imageLoaded ? 'opacity-30' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
          />
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
                <img
                  src={game.capsule || game.image}
                  alt={game.name}
                  className="w-full rounded-xl shadow-2xl border border-white/10"
                />
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

                  <Button variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
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
                      <span>Ostatnio grane: {formatDate(parseInt(game.lastPlayed))}</span>
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

            {/* Tabs for Overview / Achievements / Friends */}
            {isLoggedIn && game.platform === 'steam' && (
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
                      <span className="text-sm text-zinc-400">{achievedCount} / {mockAchievements.length}</span>
                    </div>
                    <Progress value={achievementProgress} className="h-2" />
                    <div className="grid grid-cols-2 gap-3">
                      {mockAchievements.map(achievement => (
                        <div
                          key={achievement.id}
                          className={cn(
                            'p-3 rounded-xl border transition-all',
                            achievement.achieved
                              ? 'bg-yellow-500/10 border-yellow-500/30'
                              : 'bg-zinc-800/50 border-white/5 opacity-60'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              achievement.achieved ? 'bg-yellow-500/20' : 'bg-zinc-700'
                            )}>
                              <Trophy className={cn(
                                'h-5 w-5',
                                achievement.achieved ? 'text-yellow-400' : 'text-zinc-500'
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{achievement.name}</p>
                              <p className="text-xs text-zinc-500">{achievement.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'friends' && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">Znajomi grający w tę grę</h2>
                    {mockFriendsPlaying.length > 0 ? (
                      <div className="space-y-2">
                        {mockFriendsPlaying.map(friend => (
                          <div
                            key={friend.name}
                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-white/5"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                              <span className="text-white font-bold">{friend.name[0]}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">{friend.name}</p>
                              <p className="text-xs text-zinc-500">{friend.playtime} godzin gry</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm">Żaden z twoich znajomych nie gra w tę grę.</p>
                    )}
                  </div>
                )}

                {activeTab === 'overview' && (
                  <>
                    {/* Description */}
                    {game.description && (
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">O grze</h2>
                        <p className="text-zinc-400 leading-relaxed max-w-3xl">
                          {game.description}
                        </p>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-8">
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
                    </div>
                  </>
                )}
              </>
            )}

            {/* Show overview for non-steam or not logged in */}
            {(!isLoggedIn || game.platform !== 'steam') && (
              <>
                {/* Description */}
                {game.description && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">O grze</h2>
                    <p className="text-zinc-400 leading-relaxed max-w-3xl">
                      {game.description}
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-8">
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
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
