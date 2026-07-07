'use client';

import { GameShareCard } from './rich-cards/game-share-card';
import { AchievementShareCard } from './rich-cards/achievement-share-card';
import { DealShareCard } from './rich-cards/deal-share-card';
import { LfgCard } from './rich-cards/lfg-card';
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
}

export function MessageBubble({ message, isOwn, senderName }: MessageBubbleProps) {
  if (message.deletedAt) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <p className="text-xs text-zinc-600 italic px-3 py-2">Wiadomość usunięta</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1 max-w-[85%]', isOwn ? 'ml-auto items-end' : 'items-start')}>
      {!isOwn && senderName && (
        <span className="text-[10px] text-zinc-500 px-1">{senderName}</span>
      )}
      <div
        className={cn(
          'rounded-2xl px-3 py-2 text-sm',
          isOwn
            ? 'bg-lime-500/20 border border-lime-500/30 text-lime-50'
            : 'bg-zinc-800/80 border border-white/10 text-zinc-100'
        )}
      >
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
      </div>
      <span className="text-[10px] text-zinc-600 px-1">
        {new Date(message.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
