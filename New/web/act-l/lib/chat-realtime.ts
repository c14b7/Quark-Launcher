import { client, APPWRITE_CONFIG } from './api-client';
import type { ChatMessage } from './chat-service';

const DATABASE_ID = 'quark_launcher_db';
const MESSAGES_COLLECTION = 'messages';
const CONVERSATIONS_COLLECTION = 'conversations';

export type RealtimeMessageHandler = (message: ChatMessage, event: 'create' | 'update') => void;
export type RealtimeConversationHandler = (conversationId: string) => void;

export function subscribeChatRealtime(handlers: {
  onMessage?: RealtimeMessageHandler;
  onConversationUpdate?: RealtimeConversationHandler;
  conversationIds?: string[];
}) {
  const convSet = new Set(handlers.conversationIds || []);
  const channels = [
    `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION}.documents`,
    `databases.${DATABASE_ID}.collections.${CONVERSATIONS_COLLECTION}.documents`,
  ];

  const unsubscribe = client.subscribe(channels, (event) => {
    const payload = event.payload as Record<string, unknown>;
    const collection = String(event.events?.[0] || '');

    if (collection.includes(MESSAGES_COLLECTION)) {
      const convId = String(payload.conversationId || '');
      if (convSet.size && !convSet.has(convId)) return;
      const msg: ChatMessage = {
        id: String(payload.$id),
        conversationId: convId,
        senderId: String(payload.senderId),
        type: payload.type as ChatMessage['type'],
        body: String(payload.body || ''),
        attachments: payload.attachments ? JSON.parse(String(payload.attachments)) : null,
        replyToId: (payload.replyToId as string) || null,
        editedAt: (payload.editedAt as string) || null,
        deletedAt: (payload.deletedAt as string) || null,
        createdAt: String(payload.createdAt),
      };
      const ev = event.events.some((e) => e.includes('.create')) ? 'create' : 'update';
      handlers.onMessage?.(msg, ev);
    }

    if (collection.includes(CONVERSATIONS_COLLECTION)) {
      handlers.onConversationUpdate?.(String(payload.$id));
    }
  });

  return () => {
    try {
      unsubscribe();
    } catch {
      /* ignore */
    }
  };
}

export function getChatRealtimeStatus() {
  return {
    endpoint: APPWRITE_CONFIG.endpoint,
    projectId: APPWRITE_CONFIG.projectId,
  };
}
