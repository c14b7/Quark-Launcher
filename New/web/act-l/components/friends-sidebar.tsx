'use client';

import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Loader2, MessageSquare } from 'lucide-react';
import { FriendRow } from '@/components/user/friend-row';
import { FriendCodeDisplay } from '@/components/user/friend-code-display';
import { FriendRequestsPanel } from '@/components/user/friend-requests-panel';
import { AddFriendDialog } from '@/components/user/add-friend-dialog';
import { FriendPeekCard } from '@/components/friends/friend-peek-card';
import { FriendProfileDock } from '@/components/friends/friend-profile-dock';
import { FriendsMediaCard } from '@/components/friends/friends-media-card';
import { useFriends } from '@/lib/friends-context';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { subscribeMediaSession, type MediaSessionSnapshot } from '@/lib/media-session';
import type { QuarkFriend } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface FriendsSidebarProps {
  onClose?: () => void;
  className?: string;
}

function friendSortRank(f: QuarkFriend): number {
  if (f.currentActivity === 'playing') return 0;
  if (f.listeningTitle) return 1;
  if (f.currentActivity === 'idle' || f.presence === 'idle') return 2;
  if (f.presence === 'online') return 3;
  if (f.presence === 'dnd') return 4;
  return 5;
}

export function FriendsSidebar({ onClose, className }: FriendsSidebarProps) {
  const { friends, incomingRequests, isLoading } = useFriends();
  const { conversations, setActiveConversationId } = useChat();
  const { profile, regenerateFriendCode } = useAuth();
  const { settings } = useSettings();
  const t = useTranslations('friends');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<QuarkFriend | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [peekFriend, setPeekFriend] = useState<QuarkFriend | null>(null);
  const [peekAnchor, setPeekAnchor] = useState<HTMLElement | null>(null);
  const [mediaSession, setMediaSession] = useState<MediaSessionSnapshot | null>(null);
  const peekLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeMediaSession(setMediaSession), []);

  useEffect(() => {
    const onDock = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const f = friends.find((x) => x.userId === id);
      if (f) {
        setSelectedFriend(f);
        setDockOpen(true);
        setPeekFriend(null);
      }
    };
    const onPeek = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const f = friends.find((x) => x.userId === id);
      if (f) {
        setPeekFriend(f);
        setPeekAnchor(document.body);
      }
    };
    window.addEventListener('quark-friends-dock', onDock);
    window.addEventListener('quark-friends-peek', onPeek);
    return () => {
      window.removeEventListener('quark-friends-dock', onDock);
      window.removeEventListener('quark-friends-peek', onPeek);
    };
  }, [friends]);

  const sortedFriends = [...friends].sort((a, b) => friendSortRank(a) - friendSortRank(b));
  const nowPlaying = sortedFriends.filter(
    (f) => f.currentActivity === 'playing' && f.currentGameName
  );
  const onlineFriends = sortedFriends.filter(
    (f) =>
      (f.presence === 'online' || f.presence === 'idle') &&
      !(f.currentActivity === 'playing' && f.currentGameName)
  );
  const offlineFriends = sortedFriends.filter(
    (f) => f.presence === 'dnd' || f.presence === 'offline'
  );
  const pendingCount = incomingRequests.length;
  const recentChats = [...conversations]
    .sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''))
    .slice(0, 5);

  const openChat = (conversationId: string) => {
    setActiveConversationId(conversationId);
    window.dispatchEvent(new CustomEvent('quark-navigate', { detail: 'chat' }));
  };

  const openFriendDock = (friend: QuarkFriend) => {
    setPeekFriend(null);
    setSelectedFriend(friend);
    setDockOpen(true);
  };

  const clearPeekSoon = () => {
    if (peekLeaveTimer.current) clearTimeout(peekLeaveTimer.current);
    peekLeaveTimer.current = setTimeout(() => {
      setPeekFriend(null);
      setPeekAnchor(null);
    }, 200);
  };

  const keepPeek = () => {
    if (peekLeaveTimer.current) clearTimeout(peekLeaveTimer.current);
  };

  const showMediaCard =
    Boolean(settings.earlyAccess?.friendsMedia) && settings.showFriendsMediaCard !== false;

  return (
    <>
      <aside className={cn('flex flex-col h-full', className)}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#d4ff00]/70" />
            <span className="font-semibold text-sm text-zinc-200">
              {t('title')} ({friends.filter((f) => f.presence !== 'offline').length})
            </span>
            {pendingCount > 0 && (
              <span className="text-xs bg-[#d4ff00]/20 text-[#d4ff00] px-1.5 py-0.5 rounded-full">
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
              title={t('addFriend')}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title={t('hidePanel')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {showMediaCard && <FriendsMediaCard session={mediaSession} className="mt-2" />}

        <ScrollArea className="flex-1">
          {isLoading && friends.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t('loading')}
            </div>
          ) : friends.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              <Users className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-300">{t('empty')}</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-[14rem] mx-auto">{t('emptyHint')}</p>
              <Button
                className="mt-4 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                {t('addFirst')}
              </Button>
            </div>
          ) : (
            <div className="px-2 py-3 space-y-4">
              {recentChats.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#d4ff00]/70 uppercase tracking-wider px-2 mb-1">
                    {t('recentChats')}
                  </p>
                  <div className="space-y-0.5">
                    {recentChats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openChat(c.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left hover:bg-white/5 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#d4ff00] shrink-0" />
                        <span className="text-xs text-zinc-300 truncate flex-1">{c.name}</span>
                        {c.unread && (
                          <span className="h-2 w-2 rounded-full bg-[#d4ff00] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {nowPlaying.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-500/80 uppercase tracking-wider px-2 mb-1">
                    {t('nowPlaying')} — {nowPlaying.length}
                  </p>
                  <div className="space-y-0.5">
                    {nowPlaying.map((f) => (
                      <FriendRow
                        key={f.userId}
                        friend={f}
                        onClick={() => openFriendDock(f)}
                        onHoverStart={(el) => {
                          keepPeek();
                          setPeekFriend(f);
                          setPeekAnchor(el);
                        }}
                        onHoverEnd={clearPeekSoon}
                      />
                    ))}
                  </div>
                </div>
              )}
              {onlineFriends.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
                    {t('online')} — {onlineFriends.length}
                  </p>
                  <div className="space-y-0.5">
                    {onlineFriends.map((f) => (
                      <FriendRow
                        key={f.userId}
                        friend={f}
                        onClick={() => openFriendDock(f)}
                        onHoverStart={(el) => {
                          keepPeek();
                          setPeekFriend(f);
                          setPeekAnchor(el);
                        }}
                        onHoverEnd={clearPeekSoon}
                      />
                    ))}
                  </div>
                </div>
              )}
              {offlineFriends.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
                    {t('offline')} — {offlineFriends.length}
                  </p>
                  <div className="space-y-0.5">
                    {offlineFriends.map((f) => (
                      <FriendRow
                        key={f.userId}
                        friend={f}
                        onClick={() => openFriendDock(f)}
                        onHoverStart={(el) => {
                          keepPeek();
                          setPeekFriend(f);
                          setPeekAnchor(el);
                        }}
                        onHoverEnd={clearPeekSoon}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <FriendRequestsPanel />

        {profile?.friendCode && (
          <div className="p-3 border-t border-zinc-800/80 shrink-0">
            <FriendCodeDisplay
              code={profile.friendCode}
              glowEnabled={true}
              onRegenerate={async () => {
                await regenerateFriendCode();
              }}
            />
          </div>
        )}
      </aside>

      <AddFriendDialog open={addOpen} onOpenChange={setAddOpen} />
      <FriendProfileDock
        friend={selectedFriend}
        open={dockOpen}
        onOpenChange={setDockOpen}
      />
      {peekFriend && peekAnchor && !dockOpen && (
        <FriendPeekCard
          friend={peekFriend}
          anchorEl={peekAnchor}
          onMouseEnter={keepPeek}
          onMouseLeave={clearPeekSoon}
          onClick={() => openFriendDock(peekFriend)}
        />
      )}
    </>
  );
}
