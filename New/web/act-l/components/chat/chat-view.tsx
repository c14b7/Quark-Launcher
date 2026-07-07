'use client';

import { MessageSquare } from 'lucide-react';
import { ConversationList } from './conversation-list';
import { MessageThread } from './message-thread';
import { MessageComposer } from './message-composer';
import { useChat } from '@/lib/chat-context';
import { useGames } from '@/lib/games-context';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export function ChatView() {
  const t = useTranslations('chat');
  const {
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    sendMessage,
    conversations,
  } = useChat();
  const { games } = useGames();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const conv = conversations[num - 1];
        if (conv) {
          e.preventDefault();
          setActiveConversationId(conv.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conversations, setActiveConversationId]);

  const handleLfg = async () => {
    if (!activeConversationId) return;
    const playing = games.find((g) => g.lastPlayed);
    await sendMessage(activeConversationId, {
      type: 'lfg',
      body: 'Szukam grupy!',
      attachments: {
        kind: 'lfg',
        gameName: playing?.name || 'Dowolna gra',
        gameId: playing?.id,
        mode: 'co-op',
        slots: 3,
        platform: playing?.platform,
      },
    });
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <div className="w-72 shrink-0 hidden md:flex flex-col">
        <ConversationList
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-zinc-950 to-black">
        {activeConversation ? (
          <>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-lime-400" />
              <h1 className="font-semibold text-white truncate">{activeConversation.name}</h1>
              {activeConversation.type === 'group' && (
                <span className="text-xs text-zinc-500">
                  {activeConversation.memberIds.length} {t('members')}
                </span>
              )}
            </div>
            <MessageThread conversationId={activeConversation.id} />
            <MessageComposer conversationId={activeConversation.id} onSendLfg={handleLfg} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 p-8">
            <MessageSquare className="h-16 w-16 text-zinc-700" />
            <p className="text-lg font-medium text-zinc-400">{t('selectConversation')}</p>
            <p className="text-sm text-center max-w-sm">{t('selectHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
