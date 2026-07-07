'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { chatService, type ChatConversation, type ChatMessage, type ChatAttachment } from './chat-service';
import { subscribeChatRealtime } from './chat-realtime';
import { useAuth } from './auth-context';
import { mergeOverlaySettings } from './overlay-settings';
import { useSettings } from './settings-context';
import { track } from './telemetry/client';

export interface ChatNotification {
  id: string;
  type: 'chat_message' | 'chat_mention' | 'chat_group_invite';
  conversationId: string;
  title: string;
  body: string;
  senderId?: string;
  read: boolean;
  createdAt: string;
}

interface ChatContextType {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  typingUsers: string[];
  isLoading: boolean;
  unreadTotal: number;
  chatNotifications: ChatNotification[];
  setActiveConversationId: (id: string | null) => void;
  refreshConversations: () => Promise<void>;
  openDm: (userId: string) => Promise<ChatConversation | null>;
  createGroup: (name: string, memberIds: string[]) => Promise<ChatConversation | null>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    payload: { type?: ChatMessage['type']; body?: string; attachments?: ChatAttachment; replyToId?: string }
  ) => Promise<void>;
  markRead: (conversationId: string, messageId?: string) => Promise<void>;
  sendTyping: (conversationId: string) => void;
  markChatNotificationRead: (id: string) => void;
  clearChatNotifications: () => void;
  pendingShare: { type: ChatMessage['type']; attachments: ChatAttachment; body?: string } | null;
  setPendingShare: (share: ChatContextType['pendingShare']) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const NOTIF_KEY = 'quark-chat-notifications';
const MAX_NOTIF = 50;

function loadNotifs(): ChatNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveNotifs(list: ChatNotification[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, MAX_NOTIF)));
}

function pushNotif(list: ChatNotification[], entry: Omit<ChatNotification, 'read'>): ChatNotification[] {
  if (list.some((n) => n.id === entry.id)) return list;
  return [{ ...entry, read: false }, ...list].slice(0, MAX_NOTIF);
}

async function notifyOverlay(payload: {
  title: string;
  body: string;
  conversationId: string;
  type?: string;
}) {
  if (typeof window === 'undefined' || !window.electronAPI?.showOverlayNotification) return;
  await window.electronAPI.showOverlayNotification(payload);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const overlay = mergeOverlaySettings(settings.overlay);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const [pendingShare, setPendingShare] = useState<ChatContextType['pendingShare']>(null);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const unreadTotal = useMemo(
    () => conversations.filter((c) => c.unread).length,
    [conversations]
  );

  useEffect(() => {
    setChatNotifications(loadNotifs());
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await chatService.listConversations();
    if (res.success && res.conversations) {
      setConversations(res.conversations as ChatConversation[]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshConversations();
    pollTimer.current = setInterval(() => void refreshConversations(), 60_000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [isAuthenticated, refreshConversations]);

  const handleIncomingMessage = useCallback(
    (msg: ChatMessage, event: 'create' | 'update') => {
      if (event === 'update') {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        return;
      }

      if (msg.conversationId === activeConversationId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        void chatService.markRead(msg.conversationId, msg.id);
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessageAt: msg.createdAt,
                lastMessagePreview: msg.body || c.lastMessagePreview,
                lastMessageSenderId: msg.senderId,
                unread: msg.conversationId !== activeConversationId && msg.senderId !== user?.$id,
              }
            : c
        )
      );

      if (msg.senderId === user?.$id) return;

      const conv = conversations.find((c) => c.id === msg.conversationId);
      const title = conv?.name || 'Nowa wiadomość';
      const notifId = `chat-${msg.id}`;
      const entry: Omit<ChatNotification, 'read'> = {
        id: notifId,
        type: msg.body.includes('@') ? 'chat_mention' : 'chat_message',
        conversationId: msg.conversationId,
        title,
        body: msg.body.slice(0, 120),
        senderId: msg.senderId,
        createdAt: msg.createdAt,
      };

      setChatNotifications((prev) => {
        const next = pushNotif(prev, entry);
        saveNotifs(next);
        return next;
      });

      if (overlay.showChatNotifications !== false) {
        void notifyOverlay({
          title,
          body: msg.body.slice(0, 120),
          conversationId: msg.conversationId,
          type: 'chat_message',
        });
      }

      track('chat.message_received', { conversationId: msg.conversationId }, 'social');
    },
    [activeConversationId, conversations, user?.$id, overlay.showChatNotifications]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const ids = conversations.map((c) => c.id);
    const unsub = subscribeChatRealtime({
      conversationIds: ids,
      onMessage: handleIncomingMessage,
      onConversationUpdate: () => void refreshConversations(),
    });
    return unsub;
  }, [isAuthenticated, user, conversations.map((c) => c.id).join(','), handleIncomingMessage, refreshConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    const res = await chatService.getMessages(conversationId);
    if (res.success && res.messages) {
      const list = res.messages as ChatMessage[];
      setMessages(list);
      const last = list[list.length - 1];
      if (last) await chatService.markRead(conversationId, last.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread: false } : c))
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!activeConversationId) return;
    const t = setInterval(async () => {
      const res = await chatService.getTyping(activeConversationId);
      if (res.success && res.typingUsers) setTypingUsers(res.typingUsers as string[]);
    }, 2000);
    return () => clearInterval(t);
  }, [activeConversationId]);

  const openDm = useCallback(async (targetUserId: string) => {
    const res = await chatService.openDm(targetUserId);
    if (res.success && res.conversation) {
      const conv = res.conversation as ChatConversation;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
      setActiveConversationId(conv.id);
      return conv;
    }
    return null;
  }, []);

  const createGroup = useCallback(async (name: string, memberIds: string[]) => {
    const res = await chatService.createGroup(name, memberIds);
    if (res.success && res.conversation) {
      const conv = res.conversation as ChatConversation;
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      track('chat.group_created', { memberCount: memberIds.length + 1 }, 'social');
      return conv;
    }
    return null;
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      payload: { type?: ChatMessage['type']; body?: string; attachments?: ChatAttachment; replyToId?: string }
    ) => {
      const res = await chatService.sendMessage(conversationId, payload);
      if (res.success && res.message) {
        const msg = res.message as ChatMessage;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        track('chat.message_sent', { type: payload.type || 'text' }, 'social');
        await refreshConversations();
      }
    },
    [refreshConversations]
  );

  const markRead = useCallback(async (conversationId: string, messageId?: string) => {
    await chatService.markRead(conversationId, messageId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: false } : c))
    );
  }, []);

  const sendTyping = useCallback((conversationId: string) => {
    if (typingTimer.current) return;
    void chatService.sendTyping(conversationId);
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
    }, 2000);
  }, []);

  const markChatNotificationRead = useCallback((id: string) => {
    setChatNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifs(next);
      return next;
    });
  }, []);

  const clearChatNotifications = useCallback(() => {
    setChatNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifs(next);
      return next;
    });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        typingUsers,
        isLoading,
        unreadTotal,
        chatNotifications,
        setActiveConversationId,
        refreshConversations,
        openDm,
        createGroup,
        loadMessages,
        sendMessage,
        markRead,
        sendTyping,
        markChatNotificationRead,
        clearChatNotifications,
        pendingShare,
        setPendingShare,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
