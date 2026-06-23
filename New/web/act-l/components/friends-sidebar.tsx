'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Loader2 } from 'lucide-react';
import { FriendRow } from '@/components/user/friend-row';
import { FriendCodeDisplay } from '@/components/user/friend-code-display';
import { FriendRequestsPanel } from '@/components/user/friend-requests-panel';
import { AddFriendDialog } from '@/components/user/add-friend-dialog';
import { UserCardPopover } from '@/components/user/user-card-popover';
import { useFriends } from '@/lib/friends-context';
import { useAuth } from '@/lib/auth-context';
import type { QuarkFriend } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FriendsSidebarProps {
  onClose?: () => void;
  className?: string;
}

export function FriendsSidebar({ onClose, className }: FriendsSidebarProps) {
  const { friends, incomingRequests, isLoading } = useFriends();
  const { profile, regenerateFriendCode } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<QuarkFriend | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const onlineFriends = friends.filter((f) => f.presence === 'online' || f.presence === 'idle');
  const offlineFriends = friends.filter((f) => f.presence === 'dnd' || f.presence === 'offline');
  const pendingCount = incomingRequests.length;

  const openFriendProfile = (friend: QuarkFriend) => {
    setSelectedFriend(friend);
    setProfileOpen(true);
  };

  return (
    <>
      <aside className={cn('flex flex-col h-full', className)}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <span className="font-semibold text-sm text-zinc-200">
              Znajomi ({onlineFriends.length})
            </span>
            {pendingCount > 0 && (
              <span className="text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => setAddOpen(true)}
              title="Dodaj znajomego"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Ukryj panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading && friends.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Ładowanie...
            </div>
          ) : friends.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Brak znajomych Quark</p>
              <Button
                variant="link"
                className="text-violet-400 mt-2"
                onClick={() => setAddOpen(true)}
              >
                Dodaj pierwszego znajomego
              </Button>
            </div>
          ) : (
            <div className="px-2 py-3 space-y-4">
              {onlineFriends.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
                    Online — {onlineFriends.length}
                  </p>
                  <div className="space-y-0.5">
                    {onlineFriends.map((f) => (
                      <FriendRow key={f.userId} friend={f} onClick={() => openFriendProfile(f)} />
                    ))}
                  </div>
                </div>
              )}
              {offlineFriends.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
                    Offline — {offlineFriends.length}
                  </p>
                  <div className="space-y-0.5">
                    {offlineFriends.map((f) => (
                      <FriendRow key={f.userId} friend={f} onClick={() => openFriendProfile(f)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <FriendRequestsPanel />

        {profile?.friendCode && (
          <div className="p-3 border-t border-zinc-800 shrink-0">
            <FriendCodeDisplay
              code={profile.friendCode}
              glowEnabled={true}
              onRegenerate={async () => { await regenerateFriendCode(); }}
            />
          </div>
        )}
      </aside>

      <AddFriendDialog open={addOpen} onOpenChange={setAddOpen} />
      <UserCardPopover friend={selectedFriend} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
