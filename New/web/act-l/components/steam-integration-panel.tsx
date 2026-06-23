'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  Gamepad2,
  Unlink,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  User,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import {
  formatPlaytime,
} from '@/lib/steam-integration';
import type { SteamFriend, SteamStats } from '@/lib/steam-integration';
import { callSteamApi } from '@/lib/steam-api-client';
import { loginWithSteam } from '@/lib/steam-openid';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type ConnectionStep = 'idle' | 'connected';

export function SteamIntegrationPanel() {
  const t = useTranslations('steam');
  const { updateSettings, steamUser, setSteamUser, setSteamFriends: setGlobalSteamFriends } = useSettings();
  const { steamIntegration: linkedSteam, linkSteam, unlinkSteam } = useAuth();

  const [connectionStep, setConnectionStep] = useState<ConnectionStep>('idle');
  const [showManual, setShowManual] = useState(false);
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

  const handleSteamLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const login = await loginWithSteam();
      if (!login.success || !login.steamId) {
        setError(login.error || t('loginFailed'));
        return;
      }

      const result = await linkSteam(login.steamId);
      if (!result.success) {
        setError(result.error || t('linkFailed'));
        return;
      }

      setConnectionStep('connected');
      setShowManual(false);
    } catch {
      setError(t('linkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConnect = async () => {
    if (!steamIdInput.trim()) {
      setError(t('inputRequired'));
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
        setError(result.error || t('linkFailed'));
        return;
      }

      setConnectionStep('connected');
    } catch {
      setError(t('linkError'));
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
      setShowManual(false);
    } catch {
      setError(t('unlinkFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const onlineFriends = friends.filter((f) => f.isOnline);
  const playingFriends = friends.filter((f) => f.currentGame);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11.64 5.93c2.97.03 5.36 2.44 5.36 5.42 0 2.99-2.43 5.42-5.42 5.42-.52 0-1.02-.07-1.5-.21l-3.1 1.26a.5.5 0 0 1-.67-.64l1.09-2.89a5.39 5.39 0 0 1-1.22-3.44c0-2.98 2.42-5.4 5.38-5.42h.08zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{t('title')}</h3>
          <p className="text-sm text-zinc-400">
            {connectionStep === 'connected' ? t('connectedDesc') : t('idleDesc')}
          </p>
        </div>
        {connectionStep === 'connected' && linkedSteam && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadSteamData(linkedSteam.steamId)}
            disabled={isFetchingData}
            className="text-zinc-400 hover:text-white rounded-xl"
          >
            <RefreshCw className={cn('w-4 h-4', isFetchingData && 'animate-spin')} />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {connectionStep === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Button
              onClick={handleSteamLogin}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1b2838] to-[#2a475e] hover:from-[#2a475e] hover:to-[#3d6b8e] border border-blue-500/20 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M11.64 5.93c2.97.03 5.36 2.44 5.36 5.42 0 2.99-2.43 5.42-5.42 5.42-.52 0-1.02-.07-1.5-.21l-3.1 1.26a.5.5 0 0 1-.67-.64l1.09-2.89a5.39 5.39 0 0 1-1.22-3.44c0-2.98 2.42-5.4 5.38-5.42h.08z" />
                  </svg>
                  {t('loginButton')}
                </>
              )}
            </Button>

            <p className="text-xs text-zinc-500 text-center">{t('loginHint')}</p>

            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="flex w-full items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t('manualLink')}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showManual && 'rotate-180')} />
            </button>

            {showManual && (
              <div className="space-y-3 p-4 rounded-xl border border-white/8 bg-zinc-800/30">
                <Input
                  value={steamIdInput}
                  onChange={(e) => setSteamIdInput(e.target.value)}
                  placeholder={t('inputPlaceholder')}
                  className="h-11 rounded-xl bg-zinc-800/50 border-zinc-700 focus:border-blue-500"
                />
                <Button
                  onClick={handleManualConnect}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full rounded-xl border-white/10"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('manualConnect')}
                </Button>
              </div>
            )}
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
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/50 border border-white/8">
              <Avatar className="w-14 h-14 border border-white/10">
                <AvatarImage src={steamUser.avatarUrl} />
                <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{steamUser.personaName}</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 shrink-0">
                    <Check className="w-3 h-3 mr-1" />
                    {t('connected')}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400 truncate">Steam ID: {steamUser.steamId}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl shrink-0"
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/8 text-center">
                  <Gamepad2 className="w-5 h-5 mx-auto mb-2 text-purple-400" />
                  <p className="text-2xl font-bold text-white">{stats.gamesOwned}</p>
                  <p className="text-xs text-zinc-500">{t('games')}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/8 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-blue-400" />
                  <p className="text-2xl font-bold text-white">{formatPlaytime(stats.totalPlaytime)}</p>
                  <p className="text-xs text-zinc-500">{t('playtime')}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/8 text-center">
                  <Users className="w-5 h-5 mx-auto mb-2 text-green-400" />
                  <p className="text-2xl font-bold text-white">{onlineFriends.length}</p>
                  <p className="text-xs text-zinc-500">{t('online')}</p>
                </div>
              </div>
            )}

            {playingFriends.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  {t('friendsPlaying', { count: playingFriends.length })}
                </h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {playingFriends.map((friend) => (
                      <div key={friend.steamid} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-white/8">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.avatarmedium} />
                          <AvatarFallback>{friend.personaname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{friend.personaname}</p>
                          <p className="text-xs text-green-400 truncate">{t('playing', { game: friend.currentGame })}</p>
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
                {t('loading')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
