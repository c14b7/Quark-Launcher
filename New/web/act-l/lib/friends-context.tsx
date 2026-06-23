'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { friendsService, QuarkFriend, FriendRequest } from './friends-service';
import { useAuth } from './auth-context';

interface FriendsContextType {
  friends: QuarkFriend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  lookupByCode: (code: string) => Promise<{ success: boolean; profile?: QuarkFriend; error?: string }>;
  sendRequest: (code: string) => Promise<{ success: boolean; error?: string; autoAccepted?: boolean }>;
  acceptRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  declineRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  cancelRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshFriends: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth();
  const [friends, setFriends] = useState<QuarkFriend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshFriends = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getRequests(),
      ]);

      if (friendsRes.success) {
        setFriends((friendsRes.friends as QuarkFriend[]) || []);
      }
      if (requestsRes.success) {
        setIncomingRequests((requestsRes.incoming as FriendRequest[]) || []);
        setOutgoingRequests((requestsRes.outgoing as FriendRequest[]) || []);
      }
    } catch {
      setError('Nie udało się załadować znajomych');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFriends();
    } else {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    }
  }, [isAuthenticated, refreshFriends]);

  // Presence heartbeat
  useEffect(() => {
    if (!isAuthenticated || !profile) return;

    const sendPresence = (presence: string) => {
      friendsService.updatePresence(presence, profile.customStatus).catch(() => {});
    };

    sendPresence('online');

    presenceInterval.current = setInterval(() => sendPresence('online'), 60000);

    const handleVisibility = () => {
      sendPresence(document.hidden ? 'idle' : 'online');
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
  }, [isAuthenticated, profile?.customStatus]);

  // Poll friends list every 30s as Realtime fallback
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

  return (
    <FriendsContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        isLoading,
        error,
        lookupByCode,
        sendRequest,
        acceptRequest,
        declineRequest,
        cancelRequest,
        removeFriend,
        refreshFriends,
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
