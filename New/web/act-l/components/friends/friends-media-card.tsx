'use client';

import { Pause, Play, SkipBack, SkipForward, Music2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MediaSessionSnapshot } from '@/lib/media-session';
import { mediaPlayPause, mediaNext, mediaPrevious } from '@/lib/media-session';
import { cn } from '@/lib/utils';

interface FriendsMediaCardProps {
  session: MediaSessionSnapshot | null;
  className?: string;
}

export function FriendsMediaCard({ session, className }: FriendsMediaCardProps) {
  const t = useTranslations('friends');
  if (!session?.title) return null;

  const progress =
    session.durationSec && session.durationSec > 0
      ? Math.min(100, ((session.positionSec || 0) / session.durationSec) * 100)
      : 0;

  return (
    <div
      className={cn(
        'mx-2 mb-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 shadow-lg',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {session.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.artworkUrl}
            alt=""
            className="h-11 w-11 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="h-11 w-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Music2 className="h-4 w-4 text-[#d4ff00]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('yourMedia')}</p>
          <p className="text-xs text-white font-medium truncate">{session.title}</p>
          {session.artist && (
            <p className="text-[11px] text-zinc-500 truncate">{session.artist}</p>
          )}
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#d4ff00]/80 transition-[width] duration-500"
          style={{ width: `${Math.max(2, progress)}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
          onClick={() => void mediaPrevious()}
          title={t('mediaPrev')}
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-full bg-[#d4ff00] text-black flex items-center justify-center hover:bg-[#e2ff4d]"
          onClick={() => void mediaPlayPause()}
          title={t('mediaPlayPause')}
        >
          {session.isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 ml-0.5" />
          )}
        </button>
        <button
          type="button"
          className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
          onClick={() => void mediaNext()}
          title={t('mediaNext')}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
