'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserCard } from './user-card';
import { Button } from '@/components/ui/button';
import type { QuarkFriend } from '@/lib/types';
import { useFriends } from '@/lib/friends-context';
import { useGames } from '@/lib/games-context';
import { UserMinus, Gamepad2, MessageSquare, ChartNoAxesCombined } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/lib/chat-context';
import { fetchFriendStats, type PublicStatsSummary } from '@/lib/stats-sync-service';
import { getProfileDisplayPrefs } from '@/lib/profile-preferences';

interface UserCardPopoverProps {
  friend: QuarkFriend | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserCardPopover({ friend, open, onOpenChange }: UserCardPopoverProps) {
  const { removeFriend } = useFriends();
  const { games, launchGame } = useGames();
  const { openDm } = useChat();
  const t = useTranslations('friends');
  const ts = useTranslations('stats');
  const tc = useTranslations('chat');
  const [friendStats, setFriendStats] = useState<PublicStatsSummary | null>(null);
  const [statsPrivate, setStatsPrivate] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!open || !friend) {
      setFriendStats(null);
      setStatsPrivate(false);
      return;
    }
    setStatsLoading(true);
    void fetchFriendStats(friend.userId).then((r) => {
      setFriendStats(r.summary || null);
      setStatsPrivate(Boolean(r.private));
      setStatsLoading(false);
    });
  }, [open, friend]);

  if (!friend) return null;

  const showcase = getProfileDisplayPrefs(friend.preferences).showcase;
  const launchCount = friendStats?.totals.launches;
  const steamHours = friendStats?.totals.steamHours;

  const handleRemove = async () => {
    await removeFriend(friend.userId);
    onOpenChange(false);
  };

  const sameGame =
    friend.currentActivity === 'playing' && friend.currentGameId
      ? games.find((g) => g.id === friend.currentGameId)
      : undefined;

  const handleLaunchSame = () => {
    if (sameGame) {
      launchGame(sameGame);
      onOpenChange(false);
    }
  };

  const handleMessage = async () => {
    await openDm(friend.userId);
    onOpenChange(false);
    window.dispatchEvent(new CustomEvent('quark-navigate', { detail: 'chat' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{friend.displayName}</DialogTitle>
        <UserCard
          profile={friend}
          launchCount={showcase?.showPlayStats !== false ? launchCount : undefined}
          steamHours={showcase?.showPlayStats !== false ? steamHours : undefined}
        />
        <div className="p-4 pt-0 space-y-2">
          {(friendStats || statsPrivate || statsLoading) && (
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 space-y-1.5 mb-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <ChartNoAxesCombined className="h-3 w-3" />
                {ts('friendStats')}
              </p>
              {statsLoading && <p className="text-xs text-zinc-500">{ts('loading')}</p>}
              {statsPrivate && !statsLoading && (
                <p className="text-xs text-zinc-500">{ts('friendPrivate')}</p>
              )}
              {friendStats && !statsPrivate && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm text-white font-medium">{friendStats.totals.launches}</p>
                    <p className="text-[10px] text-zinc-500">{ts('metricLaunches')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">~{friendStats.totals.sessionHours}h</p>
                    <p className="text-[10px] text-zinc-500">{ts('metricSessionHours')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{friendStats.totals.streakDays}</p>
                    <p className="text-[10px] text-zinc-500">{ts('metricStreak')}</p>
                  </div>
                </div>
              )}
              {friendStats?.topGames?.[0] && (
                <p className="text-[11px] text-zinc-400 truncate">
                  Top: {friendStats.topGames[0].name}
                </p>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
            onClick={() => void handleMessage()}
          >
            <MessageSquare className="h-4 w-4" />
            {tc('writeMessage')}
          </Button>
          {sameGame && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={handleLaunchSame}
            >
              <Gamepad2 className="h-4 w-4" />
              {t('launchSameGame')}
            </Button>
          )}
          <p className="text-[11px] text-center text-zinc-600">{t('watchPartySoon')}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleRemove}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            {t('removeFriend')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
