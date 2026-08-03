'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './conversation-list';
import { MessageThread } from './message-thread';
import { MessageComposer } from './message-composer';
import { ChatInfoPanel } from './chat-info-panel';
import { useChat } from '@/lib/chat-context';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function ChatView() {
  const t = useTranslations('chat');
  const {
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    conversations,
  } = useChat();
  const [infoOpen, setInfoOpen] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const conv = conversations[num - 1];
        if (conv) {
          e.preventDefault();
          setActiveConversationId(conv.id);
          setMobileShowThread(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conversations, setActiveConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      setInfoOpen(false);
      setMobileShowThread(false);
    }
  }, [activeConversationId]);

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileShowThread(true);
    setInfoOpen(false);
  };

  const backToList = () => {
    setMobileShowThread(false);
    setInfoOpen(false);
  };

  return (
    <div className="relative flex-1 flex min-h-0 h-full overflow-hidden">
      <div
        className={cn(
          'w-full md:w-80 shrink-0 flex flex-col min-h-0 h-full border-r border-white/10',
          mobileShowThread && activeConversation ? 'hidden md:flex' : 'flex'
        )}
      >
        <ConversationList activeId={activeConversationId} onSelect={selectConversation} />
      </div>

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 min-h-0 h-full bg-gradient-to-b from-zinc-950 to-black',
          !activeConversation && 'hidden md:flex',
          activeConversation && !mobileShowThread && 'hidden md:flex'
        )}
      >
        {activeConversation ? (
          <>
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden shrink-0"
                onClick={backToList}
                title={t('backToList')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {activeConversation.type === 'group' ? (
                <Users className="h-4 w-4 text-lime-400 shrink-0" />
              ) : (
                <MessageSquare className="h-4 w-4 text-lime-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-white truncate text-sm">{activeConversation.name}</h1>
                {activeConversation.type === 'group' && (
                  <p className="text-[10px] text-zinc-500 truncate">
                    {activeConversation.memberIds.length} {t('members')}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setInfoOpen((v) => !v)}
                title={t('conversationInfo')}
              >
                <Settings2 className={cn('h-4 w-4', infoOpen && 'text-lime-400')} />
              </Button>
            </div>

            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <MessageThread conversationId={activeConversation.id} />
                <MessageComposer conversationId={activeConversation.id} />
              </div>
              {infoOpen && (
                <div className="w-72 shrink-0 hidden lg:flex flex-col border-l border-white/10 min-h-0 h-full">
                  <ChatInfoPanel
                    conversation={activeConversation}
                    onClose={() => setInfoOpen(false)}
                    onLeft={backToList}
                  />
                </div>
              )}
            </div>

            {infoOpen && (
              <div className="lg:hidden absolute inset-0 z-20 bg-zinc-950 flex flex-col">
                <ChatInfoPanel
                  conversation={activeConversation}
                  onClose={() => setInfoOpen(false)}
                  onLeft={backToList}
                />
              </div>
            )}
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
