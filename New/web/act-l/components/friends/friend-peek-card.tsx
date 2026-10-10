'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gamepad2, Music2 } from 'lucide-react';
import type { QuarkFriend } from '@/lib/types';
import { getAvatarUrl, getBannerUrl } from '@/lib/avatar-service';
import { getProfileDisplayPrefs } from '@/lib/profile-preferences';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface FriendPeekCardProps {
  friend: QuarkFriend;
  anchorEl: HTMLElement | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

function presenceColor(p?: string) {
  switch (p) {
    case 'online':
      return 'bg-emerald-400';
    case 'idle':
      return 'bg-amber-400';
    case 'dnd':
      return 'bg-red-400';
    default:
      return 'bg-zinc-500';
  }
}

export function FriendPeekCard({
  friend,
  anchorEl,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: FriendPeekCardProps) {
  const t = useTranslations('friends');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const showcase = getProfileDisplayPrefs(friend.preferences).showcase;
  const avatarUrl = getAvatarUrl(friend.avatarFileId);
  const bannerUrl =
    getBannerUrl(friend.bannerFileId) || showcase?.favoriteGameImage || undefined;
  const initials = friend.displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!anchorEl) return;
    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      const cardW = 260;
      const left = Math.max(12, r.left - cardW - 12);
      let top = r.top;
      const maxTop = window.innerHeight - 200;
      if (top > maxTop) top = maxTop;
      setPos({ top, left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorEl, friend.userId]);

  if (!pos || typeof document === 'undefined') return null;

  const activity =
    friend.currentActivity === 'playing' && friend.currentGameName
      ? t('playingGame', { game: friend.currentGameName })
      : friend.listeningTitle
        ? t('listeningTo', { track: friend.listeningTitle })
        : friend.customStatus ||
          (friend.presence === 'offline'
            ? t('statusOffline')
            : friend.presence === 'idle'
              ? t('statusIdle')
              : friend.presence === 'dnd'
                ? t('statusDnd')
                : t('statusOnline'));

  return createPortal(
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      className={cn(
        'fixed z-[80] w-[260px] rounded-2xl overflow-hidden cursor-pointer',
        'border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl',
        'animate-in fade-in slide-in-from-right-2 duration-200'
      )}
      style={{ top: pos.top, left: pos.left }}
    >
      <div
        className="h-16 bg-zinc-900 relative"
        style={
          bannerUrl
            ? {
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2)), url(${bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />
      <div className="px-3 pb-3 -mt-6 relative">
        <div className="relative inline-block">
          <div className="h-12 w-12 rounded-full border-2 border-zinc-950 overflow-hidden bg-zinc-800">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-zinc-400">
                {initials}
              </div>
            )}
          </div>
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-950',
              presenceColor(friend.presence)
            )}
          />
        </div>
        <p className="text-sm font-semibold text-white mt-2 truncate">{friend.displayName}</p>
        {showcase?.motto && (
          <p className="text-[11px] text-zinc-400 italic truncate mt-0.5">„{showcase.motto}”</p>
        )}
        <p
          className={cn(
            'text-xs mt-1.5 flex items-center gap-1 truncate',
            friend.currentActivity === 'playing'
              ? 'text-emerald-400'
              : friend.listeningTitle
                ? 'text-[#d4ff00]'
                : 'text-zinc-500'
          )}
        >
          {friend.currentActivity === 'playing' && <Gamepad2 className="h-3 w-3 shrink-0" />}
          {friend.listeningTitle && friend.currentActivity !== 'playing' && (
            <Music2 className="h-3 w-3 shrink-0" />
          )}
          {activity}
        </p>
        <p className="text-[10px] text-zinc-600 mt-2">{t('peekHint')}</p>
      </div>
    </div>,
    document.body
  );
}
