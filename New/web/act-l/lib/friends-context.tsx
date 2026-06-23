'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { friendsService, QuarkFriend, FriendRequest } from './friends-service';
import { useAuth } from './auth-context';

export interface FriendNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted';
  displayName: string;
  createdAt: number;
  read: boolean;
}

interface FriendsContextType {
  friends: QuarkFriend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  notifications: FriendNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lookupByCode: (code: string) => Promise<{ success: boolean; profile?: QuarkFriend; error?: string }>;
  sendRequest: (code: string) => Promise<{ success: boolean; error?: string; autoAccepted?: boolean }>;
  acceptRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  declineRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  cancelRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshFriends: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);
const NOTIF_STORAGE_KEY = 'quark-friend-notifications';
const MAX_NOTIFICATIONS = 50;

function loadStoredNotifications(): FriendNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: FriendNotification[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
}

function pushNotification(
  list: FriendNotification[],
  entry: Omit<FriendNotification, 'read'> & { read?: boolean }
): FriendNotification[] {
  if (list.some((n) => n.id === entry.id)) return list;
  const next = [{ ...entry, read: entry.read ?? false }, ...list];
  return next.slice(0, MAX_NOTIFICATIONS);
}

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth();
  const [friends, setFriends] = useState<QuarkFriend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<FriendNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotRef = useRef<{
    incomingIds: Set<string>;
    outgoingIds: Set<string>;
    friendIds: Set<string>;
    initialized: boolean;
  }>({ incomingIds: new Set(), outgoingIds: new Set(), friendIds: new Set(), initialized: false });

  useEffect(() => {
    setNotifications(loadStoredNotifications());
  }, []);

  const persistNotifications = useCallback((next: FriendNotification[]) => {
    setNotifications(next);
    saveNotifications(next);
  }, []);

  const detectNotificationChanges = useCallback(
    (
      nextIncoming: FriendRequest[],
      nextOutgoing: FriendRequest[],
      nextFriends: QuarkFriend[]
    ) => {
      const snap = snapshotRef.current;
      const nextIncomingIds = new Set(nextIncoming.map((r) => r.id));
      const nextOutgoingIds = new Set(nextOutgoing.map((r) => r.id));
      const nextFriendIds = new Set(nextFriends.map((f) => f.userId));

      if (!snap.initialized) {
        snap.incomingIds = nextIncomingIds;
        snap.outgoingIds = nextOutgoingIds;
        snap.friendIds = nextFriendIds;
        snap.initialized = true;
        return;
      }

      setNotifications((prev) => {
        let updated = [...prev];
        let changed = false;

        for (const req of nextIncoming) {
          if (!snap.incomingIds.has(req.id)) {
            const name = req.profile?.displayName || 'Użytkownik';
            const before = updated.length;
            updated = pushNotification(updated, {
              id: `req-in-${req.id}`,
              type: 'friend_request',
              displayName: name,
              createdAt: Date.now(),
            });
            if (updated.length !== before) changed = true;
          }
        }

        for (const req of nextOutgoing) {
          if (snap.outgoingIds.has(req.id) && !nextOutgoingIds.has(req.id)) {
            const otherId = req.toUserId;
            if (nextFriendIds.has(otherId) && !snap.friendIds.has(otherId)) {
              const name = req.profile?.displayName || 'Użytkownik';
              const before = updated.length;
              updated = pushNotification(updated, {
                id: `req-out-${req.id}`,
                type: 'friend_accepted',
                displayName: name,
                createdAt: Date.now(),
              });
              if (updated.length !== before) changed = true;
            }
          }
        }

        if (!changed) return prev;
        saveNotifications(updated);
        return updated;
      });

      snap.incomingIds = nextIncomingIds;
      snap.outgoingIds = nextOutgoingIds;
      snap.friendIds = nextFriendIds;
    },
    []
  );

  const refreshFriends = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getRequests(),
      ]);

      const nextFriends = friendsRes.success ? ((friendsRes.friends as QuarkFriend[]) || []) : [];
      const nextIncoming = requestsRes.success ? ((requestsRes.incoming as FriendRequest[]) || []) : [];
      const nextOutgoing = requestsRes.success ? ((requestsRes.outgoing as FriendRequest[]) || []) : [];

      if (friendsRes.success) setFriends(nextFriends);
      if (requestsRes.success) {
        setIncomingRequests(nextIncoming);
        setOutgoingRequests(nextOutgoing);
      }

      if (friendsRes.success && requestsRes.success) {
        detectNotificationChanges(nextIncoming, nextOutgoing, nextFriends);
      }
    } catch {
      setError('Nie udało się załadować znajomych');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, detectNotificationChanges]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFriends();
    } else {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      snapshotRef.current = { incomingIds: new Set(), outgoingIds: new Set(), friendIds: new Set(), initialized: false };
    }
  }, [isAuthenticated, refreshFriends]);

  useEffect(() => {
    if (!isAuthenticated || !profile) return;

    const userPresence = profile.presence || 'online';
    const isManualLocked = userPresence === 'dnd' || userPresence === 'offline';

    const sendPresence = (presence: string) => {
      friendsService.updatePresence(presence, profile.customStatus).catch(() => {});
    };

    const resolvePresence = (fallback: string) => {
      if (isManualLocked) return userPresence;
      return fallback;
    };

    sendPresence(resolvePresence('online'));

    presenceInterval.current = setInterval(() => {
      sendPresence(resolvePresence('online'));
    }, 60000);

    const handleVisibility = () => {
      sendPresence(resolvePresence(document.hidden ? 'idle' : 'online'));
    };
    const handleUnload = () => sendPresence('offline');

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (presenceInterval.current) clearInterval(presenceInterval.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      sendPresence('offline');
    };
  }, [isAuthenticated, profile?.customStatus, profile?.presence]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(refreshFriends, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshFriends]);

  const lookupByCode = async (code: string) => {
    const result = await friendsService.lookupByCode(code);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, profile: result.profile as QuarkFriend };
  };

  const sendRequest = async (code: string) => {
    const result = await friendsService.sendRequest(code);
    if (result.success) await refreshFriends();
    return {
      success: result.success,
      error: result.error,
      autoAccepted: result.autoAccepted as boolean | undefined,
    };
  };

  const acceptRequest = async (id: string) => {
    const result = await friendsService.acceptRequest(id);
    if (result.success) await refreshFriends();
    return result;
  };

  const declineRequest = async (id: string) => {
    const result = await friendsService.declineRequest(id);
    if (result.success) await refreshFriends();
    return result;
  };

  const cancelRequest = async (id: string) => {
    const result = await friendsService.cancelRequest(id);
    if (result.success) await refreshFriends();
    return result;
  };

  const removeFriend = async (userId: string) => {
    const result = await friendsService.removeFriend(userId);
    if (result.success) await refreshFriends();
    return result;
  };

  const markNotificationRead = (id: string) => {
    persistNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    persistNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    persistNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <FriendsContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        notifications,
        unreadCount,
        isLoading,
        error,
        lookupByCode,
        sendRequest,
        acceptRequest,
        declineRequest,
        cancelRequest,
        removeFriend,
        refreshFriends,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (!context) throw new Error('useFriends must be used within FriendsProvider');
  return context;
}
