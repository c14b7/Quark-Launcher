'use client';

import { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { QuarkFriend } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatar-service';
import { Gamepad2, Music2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FriendRowProps {
  friend: QuarkFriend;
  onClick?: () => void;
  onHoverStart?: (el: HTMLElement) => void;
  onHoverEnd?: () => void;
  className?: string;
}

function presenceColor(presence?: string) {
  switch (presence) {
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

function activityLabel(friend: QuarkFriend, t: ReturnType<typeof useTranslations>) {
  if (friend.presence === 'dnd') return t('statusDnd');
  if (friend.currentActivity === 'playing' && friend.currentGameName) {
    return t('playingGame', { game: friend.currentGameName });
  }
  if (friend.listeningTitle) {
    return t('listeningTo', { track: friend.listeningTitle });
  }
  if (friend.currentActivity === 'idle' || friend.presence === 'idle') return t('statusIdle');
  if (friend.customStatus) return friend.customStatus;
  if (friend.presence === 'offline') return t('statusOffline');
  return t('statusOnline');
}

export function FriendRow({
  friend,
  onClick,
  onHoverStart,
  onHoverEnd,
  className,
}: FriendRowProps) {
  const t = useTranslations('friends');
  const ref = useRef<HTMLButtonElement>(null);
  const initials = friend.displayName.slice(0, 2).toUpperCase();
  const avatarUrl = getAvatarUrl(friend.avatarFileId);
  const isPlaying = friend.currentActivity === 'playing' && friend.currentGameName;
  const isListening = Boolean(friend.listeningTitle) && !isPlaying;
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (ref.current) onHoverStart?.(ref.current);
    }, 350);
  };

  const handleLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    onHoverEnd?.();
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left group',
        className
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 border border-zinc-700/80">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={friend.displayName} />}
          <AvatarFallback className="text-xs bg-zinc-800">{initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950',
            presenceColor(friend.presence),
            friend.presence === 'online' && 'animate-pulse'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{friend.displayName}</p>
        <p
          className={cn(
            'text-xs truncate flex items-center gap-1',
            isPlaying ? 'text-emerald-400' : isListening ? 'text-[#d4ff00]' : 'text-zinc-500'
          )}
        >
          {isPlaying && <Gamepad2 className="h-3 w-3 shrink-0" />}
          {isListening && (
            <span className="inline-flex items-end gap-px h-3 shrink-0" aria-hidden>
              <span className="w-0.5 h-1.5 bg-[#d4ff00] animate-pulse rounded-full" />
              <span className="w-0.5 h-2.5 bg-[#d4ff00] animate-pulse rounded-full [animation-delay:120ms]" />
              <span className="w-0.5 h-2 bg-[#d4ff00] animate-pulse rounded-full [animation-delay:240ms]" />
            </span>
          )}
          {!isPlaying && !isListening && friend.listeningTitle && (
            <Music2 className="h-3 w-3 shrink-0" />
          )}
          {activityLabel(friend, t)}
        </p>
      </div>
    </button>
  );
}
