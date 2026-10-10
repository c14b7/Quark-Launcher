'use client';

import { useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Gamepad2,
  UserMinus,
  MapPin,
  Music2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { QuarkFriend } from '@/lib/types';
import { getAvatarUrl, getBannerUrl } from '@/lib/avatar-service';
import { getProfileDisplayPrefs } from '@/lib/profile-preferences';
import { useFriends } from '@/lib/friends-context';
import { useGames } from '@/lib/games-context';
import { useChat } from '@/lib/chat-context';
import { Button } from '@/components/ui/button';
import { FriendStatsPane } from './friend-stats-pane';
import { cn } from '@/lib/utils';

interface FriendProfileDockProps {
  friend: QuarkFriend | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function presenceLabel(friend: QuarkFriend, t: ReturnType<typeof useTranslations>) {
  if (friend.presence === 'dnd') return t('statusDnd');
  if (friend.currentActivity === 'playing' && friend.currentGameName) {
    return t('playingGame', { game: friend.currentGameName });
  }
  if (friend.listeningTitle) {
    return t('listeningTo', { track: friend.listeningTitle });
  }
  if (friend.presence === 'idle') return t('statusIdle');
  if (friend.presence === 'offline') return t('statusOffline');
  return t('statusOnline');
}

function presenceDot(p?: string) {
  switch (p) {
    case 'online':
      return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
    case 'idle':
      return 'bg-amber-400';
    case 'dnd':
      return 'bg-red-400';
    default:
      return 'bg-zinc-500';
  }
}

export function FriendProfileDock({ friend, open, onOpenChange }: FriendProfileDockProps) {
  const t = useTranslations('friends');
  const tc = useTranslations('chat');
  const ta = useTranslations('account');
  const { removeFriend } = useFriends();
  const { games, launchGame } = useGames();
  const { openDm } = useChat();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, friend?.userId]);

  if (!open || !friend) return null;

  const showcase = getProfileDisplayPrefs(friend.preferences).showcase;
  const avatarUrl = getAvatarUrl(friend.avatarFileId);
  const bannerUrl =
    getBannerUrl(friend.bannerFileId) || showcase?.favoriteGameImage || undefined;
  const initials = friend.displayName.slice(0, 2).toUpperCase();
  const sameGame =
    friend.currentActivity === 'playing' && friend.currentGameId
      ? games.find((g) => g.id === friend.currentGameId)
      : undefined;

  const handleMessage = async () => {
    await openDm(friend.userId);
    onOpenChange(false);
    window.dispatchEvent(new CustomEvent('quark-navigate', { detail: 'chat' }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={friend.displayName}
        className={cn(
          'relative z-10 h-full w-full max-w-[880px] flex outline-none',
          'bg-zinc-950/98 border-l border-white/10 shadow-2xl',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Profile column */}
        <div className="w-[42%] min-w-[280px] max-w-[360px] flex flex-col border-r border-white/5">
          <div className="relative shrink-0">
            <div
              className="h-36 bg-zinc-900"
              style={
                bannerUrl
                  ? {
                      backgroundImage: `linear-gradient(to top, #09090b 0%, transparent 55%), url(${bannerUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {
                      background:
                        'linear-gradient(135deg, #18181b 0%, #27272a 50%, #1a1a0a 100%)',
                    }
              }
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute -bottom-10 left-5">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl border-2 border-zinc-950 overflow-hidden bg-zinc-800 shadow-lg">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-lg text-zinc-400">
                      {initials}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-zinc-950',
                    presenceDot(friend.presence)
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pt-14 pb-5 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                {friend.displayName}
              </h1>
              {friend.pronouns && (
                <p className="text-xs text-zinc-500 mt-0.5">{friend.pronouns}</p>
              )}
              {showcase?.motto && (
                <p className="text-sm text-zinc-300 italic mt-2">„{showcase.motto}”</p>
              )}
              <p
                className={cn(
                  'text-xs mt-2 flex items-center gap-1.5',
                  friend.currentActivity === 'playing'
                    ? 'text-emerald-400'
                    : friend.listeningTitle
                      ? 'text-[#d4ff00]'
                      : 'text-zinc-500'
                )}
              >
                {friend.currentActivity === 'playing' && <Gamepad2 className="h-3.5 w-3.5" />}
                {friend.listeningTitle && friend.currentActivity !== 'playing' && (
                  <Music2 className="h-3.5 w-3.5" />
                )}
                {presenceLabel(friend, t)}
              </p>
              {friend.location && (
                <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {friend.location}
                </p>
              )}
            </div>

            {showcase?.favoriteGameName && (
              <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                {showcase.favoriteGameImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={showcase.favoriteGameImage}
                    alt=""
                    className="h-10 w-7 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {ta('favoriteGame')}
                  </p>
                  <p className="text-sm text-white truncate">{showcase.favoriteGameName}</p>
                </div>
              </div>
            )}

            {friend.bio && (
              <p className="text-sm text-zinc-400 leading-relaxed">{friend.bio}</p>
            )}

            <div className="space-y-2 pt-2">
              <Button
                className="w-full gap-2 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
                onClick={() => void handleMessage()}
              >
                <MessageSquare className="h-4 w-4" />
                {tc('writeMessage')}
              </Button>
              {sameGame && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => {
                    launchGame(sameGame);
                    onOpenChange(false);
                  }}
                >
                  <Gamepad2 className="h-4 w-4" />
                  {t('launchSameGame')}
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={async () => {
                  await removeFriend(friend.userId);
                  onOpenChange(false);
                }}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {t('removeFriend')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats column */}
        <div className="flex-1 min-w-0 bg-zinc-950/80">
          <FriendStatsPane friend={friend} />
        </div>
      </div>
    </div>
  );
}
