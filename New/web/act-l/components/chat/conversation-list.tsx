'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChat } from '@/lib/chat-context';
import { getAvatarUrl } from '@/lib/avatar-service';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { CreateGroupDialog } from './create-group-dialog';
import type { ChatConversation } from '@/lib/chat-service';

interface ConversationListProps {
  onSelect: (id: string) => void;
  activeId: string | null;
}

export function ConversationList({ onSelect, activeId }: ConversationListProps) {
  const t = useTranslations('chat');
  const { conversations } = useChat();
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <div className="flex flex-col h-full border-r border-white/10 bg-zinc-950/50">
      <div className="p-3 flex items-center justify-between border-b border-white/10">
        <h2 className="font-semibold text-white">{t('title')}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setGroupOpen(true)}
          title={t('newGroup')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8 px-4">{t('empty')}</p>
          )}
          {conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              active={conv.id === activeId}
              onClick={() => onSelect(conv.id)}
            />
          ))}
        </div>
      </ScrollArea>
      <CreateGroupDialog open={groupOpen} onOpenChange={setGroupOpen} />
    </div>
  );
}

function ConversationRow({
  conv,
  active,
  onClick,
}: {
  conv: ChatConversation;
  active: boolean;
  onClick: () => void;
}) {
  const avatar = conv.type === 'dm' && conv.members[0]?.avatarFileId
    ? getAvatarUrl(conv.members[0].avatarFileId)
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors',
        active ? 'bg-lime-500/15 border border-lime-500/25' : 'hover:bg-white/5 border border-transparent'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        {avatar && <AvatarImage src={avatar} />}
        <AvatarFallback className="bg-zinc-800 text-xs">
          {conv.type === 'group' ? <Users className="h-4 w-4" /> : conv.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-white truncate">{conv.name}</span>
          {conv.unread && <Badge className="h-5 min-w-5 px-1 bg-lime-500 text-black text-[10px]">•</Badge>}
        </div>
        <p className="text-xs text-zinc-500 truncate">{conv.lastMessagePreview || '—'}</p>
      </div>
    </button>
  );
}
