'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { QuarkFriend } from '@/lib/types';

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

export function FriendRow({ friend, onClick, className }: FriendRowProps) {
  const initials = friend.displayName.slice(0, 2).toUpperCase();

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
          <AvatarImage src="" alt={friend.displayName} />
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
        <p className="text-xs text-zinc-500 truncate">
          {friend.customStatus || (friend.presence === 'offline' ? 'Offline' : 'Online')}
        </p>
      </div>
    </button>
  );
}
