'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { QuarkFriend } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatar-service';
import { Gamepad2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FriendRowProps {
  friend: QuarkFriend;
  onClick?: () => void;
  className?: string;
}

function presenceColor(presence?: string) {
  switch (presence) {
    case 'online': return 'bg-green-500';
    case 'idle': return 'bg-yellow-500';
    case 'dnd': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

function activityLabel(friend: QuarkFriend, t: ReturnType<typeof useTranslations>) {
  if (friend.presence === 'dnd') return t('statusDnd');
  if (friend.currentActivity === 'playing' && friend.currentGameName) {
    return t('playingGame', { game: friend.currentGameName });
  }
  if (friend.currentActivity === 'idle' || friend.presence === 'idle') return t('statusIdle');
  if (friend.customStatus) return friend.customStatus;
  if (friend.presence === 'offline') return t('statusOffline');
  return t('statusOnline');
}

export function FriendRow({ friend, onClick, className }: FriendRowProps) {
  const t = useTranslations('friends');
  const initials = friend.displayName.slice(0, 2).toUpperCase();
  const avatarUrl = getAvatarUrl(friend.avatarFileId);
  const isPlaying = friend.currentActivity === 'playing' && friend.currentGameName;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-800/60 transition-colors text-left group',
        className
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 border border-zinc-700">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={friend.displayName} />}
          <AvatarFallback className="text-xs bg-zinc-800">{initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-900',
            presenceColor(friend.presence)
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{friend.displayName}</p>
        <p className={cn(
          'text-xs truncate flex items-center gap-1',
          isPlaying ? 'text-green-400' : 'text-zinc-500'
        )}>
          {isPlaying && <Gamepad2 className="h-3 w-3 shrink-0" />}
          {activityLabel(friend, t)}
        </p>
      </div>
    </button>
  );
}
