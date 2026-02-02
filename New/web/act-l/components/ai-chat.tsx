'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  Trash2, 
  Bot, 
  User,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/lib/settings-context';
import { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if AI settings are configured
      if (!settings.aiServerUrl || !settings.aiApiToken) {
        // Demo mode - simulate AI response
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const demoResponse: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: getDemoResponse(input.trim()),
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, demoResponse]);
      } else {
        // Real API call to Open WebUI
        const response = await fetch(`${settings.aiServerUrl}/api/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.aiApiToken}`
          },
          body: JSON.stringify({
            model: settings.aiModel || 'gpt-oss:21b',
            messages: [
              {
                role: 'system',
                content: 'Jesteś pomocnym asystentem w launcherze gier Quark. Pomagasz użytkownikom z pytaniami dotyczącymi gier, ustawień launchera i ogólnych porad gamingowych. Odpowiadaj zwięźle i pomocnie po polsku.'
              },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: input.trim() }
            ],
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: data.choices?.[0]?.message?.content || 'Nie udało się uzyskać odpowiedzi.',
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('AI Chat error:', err);
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd podczas przetwarzania twojego zapytania. Sprawdź ustawienia połączenia z API w ustawieniach.',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, settings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  const isConfigured = settings.aiServerUrl && settings.aiApiToken;

  return (
    <div className="fixed right-0 top-8 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-xl border-l border-white/10 flex flex-col z-40 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Quark AI</h3>
            <p className="text-[10px] text-zinc-500">
              {isConfigured ? 'Połączono z API' : 'Tryb demo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-white/10"
            onClick={clearChat}
            title="Wyczyść czat"
          >
            <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-zinc-400" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-violet-400" />
            </div>
            <h4 className="font-semibold text-white mb-2">AI działa... ale nie tak jak powinno</h4>
            <p className="text-xs text-zinc-500 mb-4">
              Jest w stanie odpowiadać na twoje pytania ale jak wykly chatbot, zamiast miec wgląd w gry.
            </p>
            {!isConfigured && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <p className="text-[10px] text-yellow-400">
                  Skonfiguruj API w ustawieniach, aby połączyć z Open WebUI
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                  message.role === 'user' 
                    ? 'bg-blue-500/20' 
                    : 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20'
                )}>
                  {message.role === 'user' ? (
                    <User className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-violet-400" />
                  )}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-xl px-3 py-2',
                  message.role === 'user'
                    ? 'bg-blue-500/20 text-white'
                    : 'bg-zinc-800/50 text-zinc-100'
                )}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="text-[9px] text-zinc-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString('pl-PL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
                </div>
                <div className="bg-zinc-800/50 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Napisz wiadomość..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 bg-zinc-900/50 border-white/10 rounded-xl text-xs placeholder:text-zinc-600"
          />
          <Button
            size="icon"
            className="h-9 w-9 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// AI Chat toggle button for sidebar
export function AIChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full gap-2 justify-start h-8 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5"
      onClick={onClick}
    >
      <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
        <MessageCircle className="h-2.5 w-2.5 text-white" />
      </div>
      Asystent AI
    </Button>
  );
}

// Demo responses for when API is not configured
function getDemoResponse(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('cześć') || lowerInput.includes('hej') || lowerInput.includes('witaj')) {
    return 'Cześć! 👋 Jestem Quark AI, twoim asystentem gamingowym. W czym mogę ci pomóc?';
  }
  
  if (lowerInput.includes('gra') || lowerInput.includes('polecić') || lowerInput.includes('rekomendacja')) {
    return 'Na podstawie popularności polecam sprawdzić:\n\n🎮 **Elden Ring** - Niesamowita przygoda w otwartym świecie\n🌆 **Cyberpunk 2077** - Futurystyczne RPG\n🚀 **Starfield** - Kosmiczna eksploracja od Bethesdy\n\nJaki gatunek gier preferujesz?';
  }
  
  if (lowerInput.includes('ustawienia') || lowerInput.includes('konfiguracja')) {
    return 'Możesz dostosować Quark Launcher w ustawieniach (ikona ⚙️):\n\n• **Motyw** - Ciemny lub OLED\n• **Skala UI** - Dostosuj wielkość interfejsu\n• **Integracja Steam** - Połącz swoje konto\n• **API AI** - Skonfiguruj Open WebUI\n\nCzy potrzebujesz pomocy z konkretnym ustawieniem?';
  }
  
  if (lowerInput.includes('steam')) {
    return 'Quark Launcher automatycznie wykrywa gry zainstalowane przez Steam! 🎮\n\nMożesz również:\n• Zalogować się kontem Steam\n• Przeglądać osiągnięcia\n• Widzieć znajomych online\n\nCzy masz problemy z połączeniem Steam?';
  }
  
  if (lowerInput.includes('pomoc') || lowerInput.includes('help')) {
    return 'Mogę pomóc z:\n\n📚 **Pytania o gry** - Rekomendacje, porady\n⚙️ **Ustawienia** - Konfiguracja launchera\n🔧 **Problemy techniczne** - Rozwiązywanie błędów\n💡 **Funkcje** - Wyjaśnienie opcji\n\nO co chciałbyś zapytać?';
  }
  
  return 'Rozumiem twoje pytanie. W pełnej wersji z połączeniem do Open WebUI API mogę udzielić bardziej szczegółowej odpowiedzi.\n\nSkonfiguruj połączenie API w **Ustawieniach → Integracja AI**, aby odblokować pełne możliwości asystenta.';
}
