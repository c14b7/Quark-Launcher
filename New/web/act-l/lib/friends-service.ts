import { apiRequest } from './api-client';
import type { CardTheme } from './auth-service';

export interface QuarkFriend {
  userId: string;
  displayName: string;
  bio?: string;
  avatarFileId?: string | null;
  bannerFileId?: string | null;
  presence: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  cardTheme?: string;
  lastSeen?: string | null;
  createdAt?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: string;
  profile: QuarkFriend | null;
}

export interface PublicProfile extends QuarkFriend {}

export const friendsService = {
  async lookupByCode(code: string) {
    return apiRequest<{ profile: PublicProfile }>('/friends/lookup', 'POST', { code });
  },

  async sendRequest(code: string) {
    return apiRequest<{ requestId?: string; autoAccepted?: boolean }>('/friends/request', 'POST', { code });
  },

  async getRequests() {
    return apiRequest<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests', 'GET');
  },

  async acceptRequest(requestId: string) {
    return apiRequest(`/friends/requests/${requestId}/accept`, 'POST');
  },

  async declineRequest(requestId: string) {
    return apiRequest(`/friends/requests/${requestId}/decline`, 'POST');
  },

  async cancelRequest(requestId: string) {
    return apiRequest(`/friends/requests/${requestId}`, 'DELETE');
  },

  async getFriends() {
    return apiRequest<{ friends: QuarkFriend[] }>('/friends', 'GET');
  },

  async removeFriend(userId: string) {
    return apiRequest(`/friends/${userId}`, 'DELETE');
  },

  async updatePresence(presence: string, customStatus?: string) {
    return apiRequest('/friends/presence', 'POST', { presence, customStatus });
  },
};

export function parseFriendCardTheme(raw?: string): CardTheme {
  try {
    return JSON.parse(raw || '{}') as CardTheme;
  } catch {
    return { accentColor: '#8b5cf6', gradientPreset: 'violet-fuchsia', glowEnabled: false };
  }
}

export const GRADIENT_PRESETS: Record<string, string> = {
  'violet-fuchsia': 'from-violet-600 to-fuchsia-600',
  'blue-cyan': 'from-blue-600 to-cyan-500',
  'emerald': 'from-emerald-600 to-teal-500',
  'orange-red': 'from-orange-500 to-red-600',
  'zinc': 'from-zinc-700 to-zinc-900',
};
