'use client';

import { GameShareCard } from './rich-cards/game-share-card';
import { AchievementShareCard } from './rich-cards/achievement-share-card';
import { DealShareCard } from './rich-cards/deal-share-card';
import { LfgCard } from './rich-cards/lfg-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Reply } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-service';
import type { ChatMessage } from '@/lib/chat-service';
import { cn } from '@/lib/utils';

function renderTextWithMentions(text: string) {
  const parts = text.split(/(@[\w.-]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-lime-300 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  senderName?: string;
  senderAvatarFileId?: string | null;
  replyPreview?: string | null;
  onReply?: (message: ChatMessage) => void;
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatarFileId,
  replyPreview,
  onReply,
}: MessageBubbleProps) {
  if (message.deletedAt) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <p className="text-xs text-zinc-600 italic px-3 py-2">Wiadomość usunięta</p>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(senderAvatarFileId);
  const initials = (senderName || '?').slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        'group flex gap-2 max-w-[90%] sm:max-w-[85%]',
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
      )}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0 mt-5 border border-white/10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={senderName || ''} />}
          <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-300">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1 min-w-0', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && senderName && (
          <span className="text-[10px] text-zinc-500 px-1">{senderName}</span>
        )}
        <div
          className={cn(
            'relative rounded-2xl px-3 py-2 text-sm',
            isOwn
              ? 'bg-lime-500/20 border border-lime-500/30 text-lime-50 rounded-tr-md'
              : 'bg-zinc-800/80 border border-white/10 text-zinc-100 rounded-tl-md'
          )}
        >
          {replyPreview && (
            <div className="mb-1.5 pl-2 border-l-2 border-lime-500/40 text-[11px] text-zinc-400 line-clamp-2">
              {replyPreview}
            </div>
          )}
          {message.type === 'text' || message.type === 'system' ? (
            <p className="whitespace-pre-wrap break-words">{renderTextWithMentions(message.body)}</p>
          ) : null}
          {message.type === 'game_share' && message.attachments && (
            <GameShareCard data={message.attachments} />
          )}
          {message.type === 'achievement_share' && message.attachments && (
            <AchievementShareCard data={message.attachments} />
          )}
          {message.type === 'store_deal' && message.attachments && (
            <DealShareCard data={message.attachments} />
          )}
          {message.type === 'lfg' && message.attachments && (
            <LfgCard data={message.attachments} body={message.body} />
          )}
          {message.editedAt && (
            <span className="text-[10px] text-zinc-500 block mt-1">edytowano</span>
          )}
          {onReply && message.type !== 'system' && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-white/10',
                isOwn ? '-left-2' : '-right-2'
              )}
              onClick={() => onReply(message)}
              title="Odpowiedz"
            >
              <Reply className="h-3 w-3" />
            </Button>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 px-1">
          {new Date(message.createdAt).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {isOwn && (
        <Avatar className="h-8 w-8 shrink-0 mt-1 border border-lime-500/20">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-lime-500/20 text-[10px] text-lime-200">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
