import { apiRequest } from './api-client';
import type { QuarkFriend } from './friends-service';

export type ChatMessageType =
  | 'text'
  | 'game_share'
  | 'achievement_share'
  | 'store_deal'
  | 'party_invite'
  | 'system'
  | 'lfg';

export interface ChatAttachment {
  kind?: string;
  platform?: string;
  appId?: string;
  name?: string;
  image?: string;
  title?: string;
  icon?: string;
  price?: string;
  discount?: number;
  url?: string;
  gameId?: string;
  gameName?: string;
  mode?: string;
  slots?: number;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: ChatMessageType;
  body: string;
  attachments: ChatAttachment | null;
  replyToId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  type: 'dm' | 'group';
  name: string;
  avatarFileId: string | null;
  ownerId: string | null;
  memberIds: string[];
  members: QuarkFriend[];
  lastMessageAt: string | null;
  lastMessagePreview: string;
  lastMessageSenderId: string | null;
  settings: Record<string, unknown>;
  pinnedMessageIds: string[];
  createdAt: string;
  unread: boolean;
  lastReadAt: string | null;
  notifications: 'all' | 'mentions' | 'muted';
  pinned: boolean;
}

export const chatService = {
  listConversations() {
    return apiRequest<{ conversations: ChatConversation[] }>('/chat/conversations', 'GET');
  },

  openDm(userId: string) {
    return apiRequest<{ conversation: ChatConversation }>('/chat/conversations/dm', 'POST', { userId });
  },

  createGroup(name: string, memberIds: string[]) {
    return apiRequest<{ conversation: ChatConversation }>('/chat/conversations/group', 'POST', {
      name,
      memberIds,
    });
  },

  updateGroup(conversationId: string, updates: { name?: string; avatarFileId?: string }) {
    return apiRequest<{ conversation: ChatConversation }>(
      `/chat/conversations/${conversationId}`,
      'PATCH',
      updates
    );
  },

  addMember(conversationId: string, userId: string) {
    return apiRequest(`/chat/conversations/${conversationId}/members`, 'POST', { userId });
  },

  removeMember(conversationId: string, userId: string) {
    return apiRequest(`/chat/conversations/${conversationId}/members/${userId}`, 'DELETE');
  },

  getMessages(conversationId: string, cursor?: string) {
    return apiRequest<{ messages: ChatMessage[]; nextCursor: string | null }>(
      `/chat/conversations/${conversationId}/messages`,
      'GET',
      cursor ? { cursor } : undefined
    );
  },

  sendMessage(
    conversationId: string,
    payload: {
      type?: ChatMessageType;
      body?: string;
      attachments?: ChatAttachment;
      replyToId?: string;
    }
  ) {
    return apiRequest<{ message: ChatMessage }>(
      `/chat/conversations/${conversationId}/messages`,
      'POST',
      payload
    );
  },

  markRead(conversationId: string, messageId?: string) {
    return apiRequest(`/chat/conversations/${conversationId}/read`, 'POST', {
      messageId,
    });
  },

  sendTyping(conversationId: string) {
    return apiRequest(`/chat/conversations/${conversationId}/typing`, 'POST');
  },

  getTyping(conversationId: string) {
    return apiRequest<{ typingUsers: string[] }>(
      `/chat/conversations/${conversationId}/typing`,
      'GET'
    );
  },

  editMessage(messageId: string, body: string) {
    return apiRequest<{ message: ChatMessage }>(`/chat/messages/${messageId}`, 'PATCH', { body });
  },

  deleteMessage(messageId: string) {
    return apiRequest<{ message: ChatMessage }>(`/chat/messages/${messageId}`, 'DELETE');
  },
};
