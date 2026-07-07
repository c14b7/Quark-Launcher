'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/lib/auth-context';
import { MessageBubble } from './message-bubble';
import { useTranslations } from 'next-intl';

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const t = useTranslations('chat');
  const { user } = useAuth();
  const { messages, isLoading, activeConversation, typingUsers } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversationId]);

  const memberNames = new Map(
    (activeConversation?.members || []).map((m) => [m.userId, m.displayName])
  );

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-4 min-h-full flex flex-col">
        {isLoading && <p className="text-center text-zinc-500 text-sm">{t('loading')}</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-zinc-500 text-sm mt-12">{t('noMessages')}</p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === user?.$id}
            senderName={memberNames.get(msg.senderId)}
          />
        ))}
        {typingUsers.length > 0 && (
          <p className="text-xs text-zinc-500 animate-pulse">{t('typing')}</p>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
