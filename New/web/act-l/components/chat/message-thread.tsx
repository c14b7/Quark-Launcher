'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { MessageBubble } from './message-bubble';
import { useTranslations } from 'next-intl';

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const t = useTranslations('chat');
  const { user, profile } = useAuth();
  const { messages, isLoading, activeConversation, typingUsers, setReplyTo } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, conversationId]);

  const memberMap = new Map(
    (activeConversation?.members || []).map((m) => [
      m.userId,
      { name: m.displayName, avatarFileId: m.avatarFileId },
    ])
  );

  const messageById = new Map(messages.map((m) => [m.id, m]));

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="p-4 space-y-3">
        {isLoading && <p className="text-center text-zinc-500 text-sm">{t('loading')}</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-zinc-500 text-sm mt-12">{t('noMessages')}</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.$id;
          const member = memberMap.get(msg.senderId);
          const replySrc = msg.replyToId ? messageById.get(msg.replyToId) : null;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              senderName={isOwn ? profile?.displayName || 'Ty' : member?.name}
              senderAvatarFileId={
                isOwn ? profile?.avatarFileId : member?.avatarFileId
              }
              replyPreview={replySrc?.body?.slice(0, 120) || null}
              onReply={setReplyTo}
            />
          );
        })}
        {typingUsers.length > 0 && (
          <p className="text-xs text-zinc-500 animate-pulse px-1">{t('typing')}</p>
        )}
      </div>
    </div>
  );
}
