'use client';

import { Download, Pause, Play, X, HardDrive, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface DownloadItem {
  id: string;
  name: string;
  image: string;
  progress: number;
  size: string;
  downloaded: string;
  speed: string;
  status: 'downloading' | 'paused' | 'queued' | 'completed';
  eta?: string;
}

// Mock download data
const mockDownloads: DownloadItem[] = [
  {
    id: '1',
    name: 'Cyberpunk 2077 - Phantom Liberty',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
    progress: 67,
    size: '65.2 GB',
    downloaded: '43.7 GB',
    speed: '45.2 MB/s',
    status: 'downloading',
    eta: '8 min'
  },
  {
    id: '2',
    name: 'Elden Ring - Shadow of the Erdtree',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
    progress: 100,
    size: '16.5 GB',
    downloaded: '16.5 GB',
    speed: '-',
    status: 'completed'
  },
  {
    id: '3',
    name: 'Red Dead Redemption 2',
    image: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg',
    progress: 0,
    size: '120.4 GB',
    downloaded: '0 GB',
    speed: '-',
    status: 'queued'
  }
];

export function DownloadsView() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(mockDownloads);

  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const queuedDownloads = downloads.filter(d => d.status === 'queued');
  const completedDownloads = downloads.filter(d => d.status === 'completed');
  const pausedDownloads = downloads.filter(d => d.status === 'paused');

  const togglePause = (id: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: d.status === 'paused' ? 'downloading' : 'paused' as const };
      }
      return d;
    }));
  };

  const cancelDownload = (id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Download className="h-5 w-5 text-white" />
              </div>
              Pobieranie
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Zarządzaj pobieraniem i aktualizacjami gier
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <HardDrive className="h-4 w-4" />
              <span>Wolne miejsce: <span className="text-white">256.4 GB</span></span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Active Downloads */}
          {(activeDownloads.length > 0 || pausedDownloads.length > 0) && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-400" />
                Aktywne pobieranie
              </h2>
              <div className="space-y-3">
                {[...activeDownloads, ...pausedDownloads].map(download => (
                  <DownloadCard
                    key={download.id}
                    download={download}
                    onTogglePause={() => togglePause(download.id)}
                    onCancel={() => cancelDownload(download.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Queued Downloads */}
          {queuedDownloads.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                W kolejce ({queuedDownloads.length})
              </h2>
              <div className="space-y-3">
                {queuedDownloads.map(download => (
                  <DownloadCard
                    key={download.id}
                    download={download}
                    onCancel={() => cancelDownload(download.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Downloads */}
          {completedDownloads.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Zakończone ({completedDownloads.length})
              </h2>
              <div className="space-y-3">
                {completedDownloads.map(download => (
                  <DownloadCard
                    key={download.id}
                    download={download}
                    onCancel={() => cancelDownload(download.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {downloads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <Download className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Brak aktywnych pobrań</p>
              <p className="text-sm mt-1">Twoje pobierane gry pojawią się tutaj</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DownloadCardProps {
  download: DownloadItem;
  onTogglePause?: () => void;
  onCancel: () => void;
}

function DownloadCard({ download, onTogglePause, onCancel }: DownloadCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all group">
      <img
        src={download.image}
        alt={download.name}
        className="w-24 h-12 object-cover rounded-lg"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-white truncate">{download.name}</h3>
          <Badge
            variant="secondary"
            className={
              download.status === 'downloading' ? 'bg-blue-500/20 text-blue-400' :
              download.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
              download.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              'bg-zinc-500/20 text-zinc-400'
            }
          >
            {download.status === 'downloading' && 'Pobieranie'}
            {download.status === 'paused' && 'Wstrzymano'}
            {download.status === 'completed' && 'Zakończono'}
            {download.status === 'queued' && 'W kolejce'}
          </Badge>
        </div>
        
        {download.status !== 'completed' && download.status !== 'queued' && (
          <Progress value={download.progress} className="h-2 mb-2" />
        )}
        
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{download.downloaded} / {download.size}</span>
          {download.status === 'downloading' && (
            <span className="text-blue-400">{download.speed} • ETA: {download.eta}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {(download.status === 'downloading' || download.status === 'paused') && onTogglePause && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={onTogglePause}
          >
            {download.status === 'paused' ? (
              <Play className="h-4 w-4 text-green-400" />
            ) : (
              <Pause className="h-4 w-4 text-yellow-400" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:text-red-400"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
