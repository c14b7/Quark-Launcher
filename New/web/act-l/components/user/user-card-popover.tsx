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
import { useGames } from '@/lib/games-context';
import { UserMinus, Gamepad2, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/lib/chat-context';

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
  const tc = useTranslations('chat');

  if (!friend) return null;

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
        <DialogTitle className="sr-only">
          {friend.displayName}
        </DialogTitle>
        <UserCard profile={friend} />
        <div className="p-4 pt-0 space-y-2">
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
            Usuń ze znajomych
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
