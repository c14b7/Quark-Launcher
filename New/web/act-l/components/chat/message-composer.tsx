'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/lib/chat-context';
import { useTranslations } from 'next-intl';
import type { ChatMessage, ChatAttachment } from '@/lib/chat-service';

const QUICK_REPLIES = ['GG', 'Dołącz', 'Zaraz wracam', 'Gram w to samo'];

interface MessageComposerProps {
  conversationId: string;
}

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const t = useTranslations('chat');
  const {
    sendMessage,
    sendTyping,
    pendingShare,
    setPendingShare,
    replyTo,
    setReplyTo,
  } = useChat();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingShare) setText(pendingShare.body || '');
  }, [pendingShare]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const submit = async (override?: {
    type?: ChatMessage['type'];
    body?: string;
    attachments?: unknown;
  }) => {
    const body = override?.body ?? text.trim();
    if (!body && !pendingShare && !override?.attachments) return;
    setSending(true);
    await sendMessage(conversationId, {
      type: (override?.type || pendingShare?.type || 'text') as ChatMessage['type'],
      body,
      attachments: (override?.attachments || pendingShare?.attachments) as
        | ChatAttachment
        | undefined,
      replyToId: replyTo?.id,
    });
    setText('');
    setPendingShare(null);
    setReplyTo(null);
    setSending(false);
  };

  return (
    <div className="border-t border-white/10 p-3 space-y-2 bg-zinc-950/80 shrink-0">
      {replyTo && (
        <div className="flex items-start gap-2 rounded-lg bg-zinc-900/80 border border-white/10 px-3 py-2">
          <Reply className="h-3.5 w-3.5 text-lime-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-lime-400/80 uppercase tracking-wide">{t('replying')}</p>
            <p className="text-xs text-zinc-400 truncate">{replyTo.body || '…'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setReplyTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
{/*       <div className="flex gap-1 flex-wrap">
        {QUICK_REPLIES.map((q) => (
          <Button
            key={q}
            variant="ghost"
            size="sm"
            className="h-7 text-xs rounded-full border border-white/10"
            onClick={() => void submit({ body: q })}
          >
            {q}
          </Button>
        ))}
      </div> */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            sendTyping(conversationId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
            if (e.key === 'Escape' && replyTo) setReplyTo(null);
          }}
          placeholder={t('placeholder')}
          className="flex-1 bg-zinc-900 border-white/10 rounded-xl"
        />
        <Button
          className="shrink-0 bg-lime-500 hover:bg-lime-600 text-black"
          size="icon"
          disabled={sending}
          onClick={() => void submit()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {pendingShare && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-lime-400 truncate">{t('pendingShare')}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-zinc-400"
            onClick={() => setPendingShare(null)}
          >
            {t('cancelShare')}
          </Button>
        </div>
      )}
    </div>
  );
}
