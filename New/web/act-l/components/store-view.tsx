'use client';

import { Search, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/lib/store-context';
import { useGames } from '@/lib/games-context';
import { useChat } from '@/lib/chat-context';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Game } from '@/lib/types';
import type { StoreListing } from '@/lib/store-service';

interface StoreViewProps {
  onGameSelect?: (game: Game) => void;
}

export function StoreView({ onGameSelect }: StoreViewProps) {
  const t = useTranslations('store');
  const { tab, setTab, listings, isLoading, searchQuery, setSearchQuery } = useStore();
  const { games } = useGames();
  const { setPendingShare, activeConversationId } = useChat();

  const ownedIds = new Set(games.map((g) => g.id));

  const tabs = [
    { id: 'steam' as const, label: t('tabSteam') },
    { id: 'deals' as const, label: t('tabDeals') },
    { id: 'epic' as const, label: t('tabEpic') },
  ];

  const shareDeal = (item: StoreListing) => {
    setPendingShare({
      type: 'store_deal',
      body: item.name,
      attachments: {
        kind: 'deal',
        platform: item.platform,
        title: item.name,
        name: item.name,
        price: item.price,
        discount: item.discountPercent,
        url: item.storeUrl,
        image: item.image,
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="p-4 border-b border-white/10 space-y-3">
        <h1 className="text-xl font-bold text-white">{t('title')}</h1>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tb) => (
            <Button
              key={tb.id}
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-full border',
                tab === tb.id
                  ? 'bg-lime-500/20 border-lime-500/40 text-lime-200'
                  : 'border-white/10 text-zinc-400'
              )}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </Button>
          ))}
        </div>
        {tab === 'steam' && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              className="pl-9 bg-zinc-900 border-white/10 rounded-xl"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
          {isLoading && (
            <p className="col-span-full text-center text-zinc-500 py-12">{t('loading')}</p>
          )}
          {!isLoading && listings.length === 0 && (
            <p className="col-span-full text-center text-zinc-500 py-12">{t('empty')}</p>
          )}
          {listings.map((item) => {
            const owned = tab === 'steam' && ownedIds.has(item.id);
            const libGame = games.find((g) => g.id === item.id);
            return (
              <div
                key={`${item.platform}-${item.id}`}
                className="group rounded-xl overflow-hidden bg-zinc-900/60 border border-white/10 hover:border-lime-500/30 transition-colors"
              >
                <div className="aspect-[16/9] relative bg-zinc-800">
                  {item.image && (
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  )}
                  {item.discountPercent ? (
                    <Badge className="absolute top-2 left-2 bg-lime-500 text-black">
                      -{item.discountPercent}%
                    </Badge>
                  ) : null}
                  {owned && (
                    <Badge className="absolute top-2 right-2 bg-violet-500/90">{t('owned')}</Badge>
                  )}
                </div>
                <div className="p-2.5 space-y-2">
                  <p className="text-sm font-medium text-white line-clamp-2 min-h-[2.5rem]">{item.name}</p>
                  {item.price && <p className="text-xs text-lime-400">{item.price}</p>}
                  <div className="flex gap-1">
                    {item.storeUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 flex-1 text-xs"
                        onClick={() => window.open(item.storeUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {t('open')}
                      </Button>
                    )}
                    {libGame && onGameSelect && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onGameSelect(libGame)}
                      >
                        {t('details')}
                      </Button>
                    )}
                    {activeConversationId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => shareDeal(item)}
                        title={t('shareChat')}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
