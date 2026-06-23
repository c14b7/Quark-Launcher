'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  Gamepad2,
  Link2,
  Unlink,
  RefreshCw,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import {
  steamIntegration,
  SteamFriend,
  SteamStats,
  formatPlaytime,
  getPersonaStateText,
} from '@/lib/steam-integration';
import { callSteamApi } from '@/lib/steam-api-client';
import { cn } from '@/lib/utils';

type ConnectionStep = 'idle' | 'input' | 'connected';

export function SteamIntegrationPanel() {
  const { updateSettings, steamUser, setSteamUser, setSteamFriends: setGlobalSteamFriends } = useSettings();
  const { steamIntegration: linkedSteam, linkSteam, unlinkSteam } = useAuth();

  const [connectionStep, setConnectionStep] = useState<ConnectionStep>('idle');
  const [steamIdInput, setSteamIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [friends, setFriends] = useState<SteamFriend[]>([]);
  const [stats, setStats] = useState<SteamStats | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);

  useEffect(() => {
    if (linkedSteam) {
      setConnectionStep('connected');
      setSteamUser({
        steamId: linkedSteam.steamId,
        personaName: linkedSteam.personaName,
        avatarUrl: linkedSteam.avatarUrl,
        avatarMediumUrl: linkedSteam.avatarUrl,
        avatarFullUrl: linkedSteam.avatarUrl,
        profileUrl: linkedSteam.profileUrl,
        isOnline: true,
      });
      updateSettings({ steamUserId: linkedSteam.steamId });
      loadSteamData(linkedSteam.steamId);
    }
  }, [linkedSteam]);

  const convertToGlobalFriendFormat = (list: SteamFriend[]) =>
    list.map((f) => ({
      steamId: f.steamid,
      personaName: f.personaname,
      avatarUrl: f.avatarfull || f.avatarmedium || f.avatar,
      isOnline: f.isOnline,
      currentGame: f.currentGame,
      friendSince: f.friendSince,
    }));

  const loadSteamData = async (steamId: string) => {
    setIsFetchingData(true);
    try {
      const [friendsRes, statsRes] = await Promise.all([
        callSteamApi<SteamFriend[]>('getFriends', { steamId }),
        callSteamApi<{ stats: SteamStats }>('getStatsSummary', { steamId }),
      ]);

      if (friendsRes.success && friendsRes.data) {
        setFriends(friendsRes.data);
        setGlobalSteamFriends(convertToGlobalFriendFormat(friendsRes.data));
      }
      if (statsRes.success && statsRes.data) {
        setStats((statsRes.data as { stats: SteamStats }).stats || (statsRes.data as unknown as SteamStats));
      }
    } catch (err) {
      console.error('Error loading Steam data:', err);
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleConnect = async () => {
    if (!steamIdInput.trim()) {
      setError('Wprowadź Steam ID lub URL profilu');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      let steamId = steamIdInput.trim();
      let vanityUrl: string | undefined;

      try {
        const parsed = new URL(steamId.startsWith('http') ? steamId : `https://${steamId}`);
        const match = parsed.pathname.match(/^\/(?:id|profiles)\/([^/]+)/);
        if (match) {
          if (parsed.pathname.startsWith('/profiles/')) {
            steamId = match[1];
          } else {
            vanityUrl = match[1];
            steamId = '';
          }
        }
      } catch {
        // not a URL
      }

      if (!/^\d{17}$/.test(steamId) && !vanityUrl) {
        vanityUrl = steamId;
        steamId = '';
      }

      const result = await linkSteam(steamId || undefined, vanityUrl);
      if (!result.success) {
        setError(result.error || 'Nie udało się połączyć konta Steam');
        return;
      }

      setConnectionStep('connected');
    } catch {
      setError('Wystąpił błąd podczas łączenia konta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await unlinkSteam();
      updateSettings({ steamUserId: undefined });
      setSteamUser(null);
      setGlobalSteamFriends([]);
      setConnectionStep('idle');
      setFriends([]);
      setStats(null);
      setSteamIdInput('');
    } catch {
      setError('Nie udało się rozłączyć konta Steam');
    } finally {
      setIsLoading(false);
    }
  };

  const onlineFriends = friends.filter((f) => f.isOnline);
  const playingFriends = friends.filter((f) => f.currentGame);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.64 5.93c2.97.03 5.36 2.44 5.36 5.42 0 2.99-2.43 5.42-5.42 5.42-.52 0-1.02-.07-1.5-.21l-3.1 1.26a.5.5 0 0 1-.67-.64l1.09-2.89a5.39 5.39 0 0 1-1.22-3.44c0-2.98 2.42-5.4 5.38-5.42h.08zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Integracja Steam</h3>
          <p className="text-sm text-zinc-400">
            {connectionStep === 'connected'
              ? 'Konto Steam połączone przez serwer Quark'
              : 'Połącz konto Steam — bez podawania własnego klucza API'}
          </p>
        </div>
        {connectionStep === 'connected' && linkedSteam && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadSteamData(linkedSteam.steamId)}
            disabled={isFetchingData}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className={cn('w-4 h-4', isFetchingData && 'animate-spin')} />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {connectionStep === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Button
              onClick={() => setConnectionStep('input')}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
            >
              <Link2 className="w-5 h-5 mr-2" />
              Połącz konto Steam
            </Button>
          </motion.div>
        )}

        {connectionStep === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">
                Steam ID lub URL profilu <span className="text-red-400">*</span>
              </label>
              <Input
                value={steamIdInput}
                onChange={(e) => setSteamIdInput(e.target.value)}
                placeholder="76561198xxxxxxxxx lub https://steamcommunity.com/id/..."
                className="h-12 bg-zinc-800/50 border-zinc-700 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setConnectionStep('idle'); setError(null); }} className="flex-1">
                Anuluj
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Połącz<ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </motion.div>
        )}

        {connectionStep === 'connected' && steamUser && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <Avatar className="w-14 h-14">
                <AvatarImage src={steamUser.avatarUrl} />
                <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{steamUser.personaName}</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                    <Check className="w-3 h-3 mr-1" />
                    Połączono
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">Steam ID: {steamUser.steamId}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <Gamepad2 className="w-5 h-5 mx-auto mb-2 text-purple-400" />
                  <p className="text-2xl font-bold text-white">{stats.gamesOwned}</p>
                  <p className="text-xs text-zinc-500">Gier</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-blue-400" />
                  <p className="text-2xl font-bold text-white">{formatPlaytime(stats.totalPlaytime)}</p>
                  <p className="text-xs text-zinc-500">Czas gry</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <Users className="w-5 h-5 mx-auto mb-2 text-green-400" />
                  <p className="text-2xl font-bold text-white">{onlineFriends.length}</p>
                  <p className="text-xs text-zinc-500">Online</p>
                </div>
              </div>
            )}

            {playingFriends.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Znajomi w grze ({playingFriends.length})
                </h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {playingFriends.map((friend) => (
                      <div key={friend.steamid} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.avatarmedium} />
                          <AvatarFallback>{friend.personaname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{friend.personaname}</p>
                          <p className="text-xs text-green-400 truncate">Gra w: {friend.currentGame}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {isFetchingData && friends.length === 0 && (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Ładowanie danych Steam...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
