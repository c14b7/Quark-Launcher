'use client';

import { useState, useEffect } from 'react';
import { Bell, ExternalLink, Calendar, Gamepad2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGames } from '@/lib/games-context';

interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  is_external_url: boolean;
  author: string;
  contents: string;
  feedlabel: string;
  date: number;
  feedname: string;
  appId: string;
  feed_type: number;
}

interface DisplayNewsItem {
  id: string;
  title: string;
  summary: string;
  image: string;
  game: string;
  gameImage: string;
  date: string;
  category: 'update' | 'event' | 'dlc' | 'announcement';
  url: string;
  appId: string;
}

export function NewsView() {
  const { games } = useGames();
  const [news, setNews] = useState<DisplayNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Pobierz appIds gier Steam z biblioteki
      const steamGames = games.filter(g => g.platform === 'steam');
      const appIds = steamGames.map(g => g.id);

      if (appIds.length === 0) {
        setNews([]);
        setIsLoading(false);
        return;
      }

      // Używamy Electron API do pobrania newsów
      if (typeof window !== 'undefined' && window.electronAPI.steamGetNews) {
        const result = await window.electronAPI.steamGetNews(appIds, 5);
        
        if (result.success && result.data) {
          const displayNews: DisplayNewsItem[] = result.data.map((item: SteamNewsItem) => {
            // Znajdź grę po appId
            const game = steamGames.find(g => g.id === String(item.appId));
            
            // Wykryj kategorię na podstawie feedlabel/title
            let category: DisplayNewsItem['category'] = 'announcement';
            const titleLower = item.title.toLowerCase();
            const feedLower = (item.feedlabel || '').toLowerCase();
            
            if (titleLower.includes('update') || titleLower.includes('patch') || feedLower.includes('patch')) {
              category = 'update';
            } else if (titleLower.includes('dlc') || titleLower.includes('expansion')) {
              category = 'dlc';
            } else if (titleLower.includes('event') || titleLower.includes('weekend') || titleLower.includes('sale')) {
              category = 'event';
            }

            // Wyciągnij obrazek z treści (jeśli jest)
            let imageUrl = game?.image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.appId}/header.jpg`;
            const imgMatch = item.contents?.match(/\[img\](.*?)\[\/img\]|<img.*?src="([^"]+)"/);
            if (imgMatch) {
              imageUrl = imgMatch[1] || imgMatch[2] || imageUrl;
            }

            // Wyczyść treść z tagów BBCode/HTML
            let summary = item.contents || '';
            summary = summary.replace(/\[.*?\]/g, '').replace(/<[^>]+>/g, '').trim();
            summary = summary.substring(0, 200) + (summary.length > 200 ? '...' : '');

            return {
              id: item.gid,
              title: item.title,
              summary: summary,
              image: imageUrl,
              game: game?.name || `Steam App ${item.appId}`,
              gameImage: game?.image || imageUrl,
              date: new Date(item.date * 1000).toISOString(),
              category,
              url: item.url,
              appId: String(item.appId)
            };
          });

          setNews(displayNews);
        } else {
          setError('Nie udało się pobrać aktualności');
        }
      } else {
        setError('API aktualności niedostępne');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Błąd pobierania aktualności');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (games.length > 0) {
      fetchNews();
    }
  }, [games]);

  const getCategoryStyle = (category: DisplayNewsItem['category']) => {
    switch (category) {
      case 'update':
        return 'bg-blue-500/20 text-blue-400';
      case 'event':
        return 'bg-purple-500/20 text-purple-400';
      case 'dlc':
        return 'bg-green-500/20 text-green-400';
      case 'announcement':
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const getCategoryLabel = (category: DisplayNewsItem['category']) => {
    switch (category) {
      case 'update': return 'Aktualizacja';
      case 'event': return 'Wydarzenie';
      case 'dlc': return 'DLC';
      case 'announcement': return 'Ogłoszenie';
    }
  };

  const openNewsUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              Aktualności
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Najnowsze wiadomości z twoich gier Steam
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNews}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-4" />
              <p className="text-zinc-400">Pobieranie aktualności...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchNews}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400">Brak aktualności</p>
              <p className="text-zinc-500 text-sm">Dodaj gry Steam do biblioteki, aby zobaczyć aktualności</p>
            </div>
          ) : (
            news.map(newsItem => (
              <article
                key={newsItem.id}
                className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
                onClick={() => openNewsUrl(newsItem.url)}
              >
                <img
                  src={newsItem.image}
                  alt={newsItem.title}
                  className="w-48 h-28 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = `https://cdn.akamai.steamstatic.com/steam/apps/${newsItem.appId}/header.jpg`;
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={getCategoryStyle(newsItem.category)}>
                      {getCategoryLabel(newsItem.category)}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Gamepad2 className="h-3 w-3" />
                      {newsItem.game}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-violet-400 transition-colors line-clamp-1">
                    {newsItem.title}
                  </h3>
                  
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
                    {newsItem.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(newsItem.date).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Czytaj więcej
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
