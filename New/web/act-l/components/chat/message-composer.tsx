'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChat } from '@/lib/chat-context';
import { useTranslations } from 'next-intl';
import type { ChatMessage, ChatAttachment } from '@/lib/chat-service';

const QUICK_REPLIES = ['GG', 'Dołącz', 'Zaraz wracam', 'Gram w to samo'];

interface MessageComposerProps {
  conversationId: string;
  onSendLfg?: () => void;
}

export function MessageComposer({ conversationId, onSendLfg }: MessageComposerProps) {
  const t = useTranslations('chat');
  const { sendMessage, sendTyping, pendingShare, setPendingShare } = useChat();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (pendingShare) {
      setText(pendingShare.body || '');
    }
  }, [pendingShare]);

  const submit = async (override?: { type?: ChatMessage['type']; body?: string; attachments?: unknown }) => {
    const body = override?.body ?? text.trim();
    if (!body && !pendingShare && !override?.attachments) return;
    setSending(true);
    await sendMessage(conversationId, {
      type: (override?.type || pendingShare?.type || 'text') as ChatMessage['type'],
      body,
      attachments: (override?.attachments || pendingShare?.attachments) as ChatAttachment | undefined,
    });
    setText('');
    setPendingShare(null);
    setSending(false);
  };

  return (
    <div className="border-t border-white/10 p-3 space-y-2 bg-zinc-950/80">
      <div className="flex gap-1 flex-wrap">
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
      </div>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10">
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-white/10">
            <DropdownMenuItem onClick={onSendLfg}>{t('sendLfg')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
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
        <p className="text-xs text-lime-400 flex items-center gap-1">
          <Zap className="h-3 w-3" /> {t('pendingShare')}
        </p>
      )}
    </div>
  );
}
