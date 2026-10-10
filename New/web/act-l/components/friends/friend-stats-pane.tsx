'use client';

import { useEffect, useState } from 'react';
import { ChartNoAxesCombined, Flame, Gamepad2, Clock, Music2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { QuarkFriend } from '@/lib/types';
import { fetchFriendStats, type PublicStatsSummary } from '@/lib/stats-sync-service';
import { cn } from '@/lib/utils';

interface FriendStatsPaneProps {
  friend: QuarkFriend;
  className?: string;
}

export function FriendStatsPane({ friend, className }: FriendStatsPaneProps) {
  const ts = useTranslations('stats');
  const tf = useTranslations('friends');
  const [summary, setSummary] = useState<PublicStatsSummary | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchFriendStats(friend.userId).then((r) => {
      if (cancelled) return;
      setSummary(r.summary || null);
      setIsPrivate(Boolean(r.private));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [friend.userId]);

  const listening =
    friend.listeningTitle &&
    (friend.listeningArtist || friend.listeningTitle)
      ? { title: friend.listeningTitle, artist: friend.listeningArtist, art: friend.listeningArtUrl }
      : null;

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      <div className="px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4ff00]/80 flex items-center gap-1.5">
          <ChartNoAxesCombined className="h-3.5 w-3.5" />
          {ts('friendStats')}
        </p>
        <h2 className="text-lg font-semibold text-white mt-1 tracking-tight">{friend.displayName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {listening && (
          <section className="rounded-2xl border border-[#d4ff00]/20 bg-[#d4ff00]/5 p-3 flex items-center gap-3">
            {listening.art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listening.art} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-[#d4ff00]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#d4ff00]/70">{tf('listeningNow')}</p>
              <p className="text-sm text-white truncate">{listening.title}</p>
              {listening.artist && (
                <p className="text-xs text-zinc-500 truncate">{listening.artist}</p>
              )}
            </div>
          </section>
        )}

        {loading && <p className="text-sm text-zinc-500">{ts('loading')}</p>}
        {!loading && isPrivate && (
          <p className="text-sm text-zinc-500 rounded-2xl border border-white/5 bg-black/20 px-4 py-8 text-center">
            {ts('friendPrivate')}
          </p>
        )}
        {!loading && !isPrivate && !summary && (
          <p className="text-sm text-zinc-500 rounded-2xl border border-white/5 bg-black/20 px-4 py-8 text-center">
            {tf('noFriendStats')}
          </p>
        )}

        {!loading && !isPrivate && summary && (
          <>
            <section className="grid grid-cols-2 gap-2">
              <StatTile
                icon={<Gamepad2 className="h-3.5 w-3.5" />}
                label={ts('metricLaunches')}
                value={String(summary.totals.launches)}
              />
              <StatTile
                icon={<Clock className="h-3.5 w-3.5" />}
                label={ts('metricSessionHours')}
                value={`~${summary.totals.sessionHours}h`}
              />
              <StatTile
                icon={<Flame className="h-3.5 w-3.5" />}
                label={ts('metricStreak')}
                value={String(summary.totals.streakDays)}
              />
              <StatTile
                icon={<ChartNoAxesCombined className="h-3.5 w-3.5" />}
                label={ts('metricSteam')}
                value={`~${summary.totals.steamHours}h`}
              />
            </section>

            {summary.topGames?.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500">{ts('topGames')}</h3>
                <div className="space-y-2">
                  {summary.topGames.slice(0, 5).map((g, i) => (
                    <div key={`${g.name}-${i}`} className="flex items-center gap-3">
                      <span className="text-[#d4ff00] font-mono text-xs w-4">{i + 1}</span>
                      {g.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.image} alt="" className="h-10 w-7 rounded object-cover bg-zinc-800" />
                      ) : (
                        <div className="h-10 w-7 rounded bg-zinc-800" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{g.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {g.hours != null
                            ? ts('hours', { hours: g.hours })
                            : ts('launches', { count: g.launchCount })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {summary.topGenres?.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500">{ts('genres')}</h3>
                {summary.topGenres.slice(0, 5).map((g) => (
                  <div key={g.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-200">{g.name}</span>
                      <span className="text-zinc-500">{Math.round(g.share * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-[#d4ff00]/70"
                        style={{ width: `${Math.max(6, Math.round(g.share * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-lg font-semibold text-white mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
