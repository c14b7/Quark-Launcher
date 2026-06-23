'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserCard } from './user-card';
import { Button } from '@/components/ui/button';
import type { QuarkFriend } from '@/lib/types';
import { useFriends } from '@/lib/friends-context';
import { UserMinus } from 'lucide-react';

interface UserCardPopoverProps {
  friend: QuarkFriend | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserCardPopover({ friend, open, onOpenChange }: UserCardPopoverProps) {
  const { removeFriend } = useFriends();

  if (!friend) return null;

  const handleRemove = async () => {
    await removeFriend(friend.userId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {friend.displayName}
        </DialogTitle>
        <UserCard profile={friend} />
        <div className="p-4 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleRemove}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Usuń ze znajomych
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
