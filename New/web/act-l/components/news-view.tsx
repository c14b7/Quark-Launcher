'use client';

import { Bell, ExternalLink, Calendar, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  image: string;
  game: string;
  gameImage: string;
  date: string;
  category: 'update' | 'event' | 'dlc' | 'announcement';
  url?: string;
}

// Mock news data
const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Elden Ring: Shadow of the Erdtree - Premiera DLC',
    summary: 'Nowe rozszerzenie do gry Elden Ring jest już dostępne! Poznaj nowe tereny, bossów i przedmioty.',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
    game: 'Elden Ring',
    gameImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
    date: '2024-06-21',
    category: 'dlc'
  },
  {
    id: '2',
    title: 'Counter-Strike 2 - Nowa mapa i aktualizacja broni',
    summary: 'Valve wydało nową aktualizację zawierającą nową mapę oraz zmiany w balansie broni.',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
    game: 'Counter-Strike 2',
    gameImage: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
    date: '2024-06-20',
    category: 'update'
  },
  {
    id: '3',
    title: 'Cyberpunk 2077 - Weekend darmowego grania',
    summary: 'Wypróbuj Cyberpunk 2077 za darmo przez cały weekend! Oferta dostępna do niedzieli.',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
    game: 'Cyberpunk 2077',
    gameImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
    date: '2024-06-19',
    category: 'event'
  },
  {
    id: '4',
    title: 'GTA VI - Oficjalna data premiery',
    summary: 'Rockstar Games ogłosił oficjalną datę premiery Grand Theft Auto VI.',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
    game: 'Grand Theft Auto V',
    gameImage: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
    date: '2024-06-18',
    category: 'announcement'
  }
];

export function NewsView() {
  const getCategoryStyle = (category: NewsItem['category']) => {
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

  const getCategoryLabel = (category: NewsItem['category']) => {
    switch (category) {
      case 'update': return 'Aktualizacja';
      case 'event': return 'Wydarzenie';
      case 'dlc': return 'DLC';
      case 'announcement': return 'Ogłoszenie';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              Aktualności
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Najnowsze wiadomości z twoich gier
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {mockNews.map(news => (
            <article
              key={news.id}
              className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
            >
              <img
                src={news.image}
                alt={news.title}
                className="w-48 h-28 object-cover rounded-lg flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={getCategoryStyle(news.category)}>
                    {getCategoryLabel(news.category)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Gamepad2 className="h-3 w-3" />
                    {news.game}
                  </div>
                </div>
                
                <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-violet-400 transition-colors">
                  {news.title}
                </h3>
                
                <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
                  {news.summary}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(news.date).toLocaleDateString('pl-PL', {
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
