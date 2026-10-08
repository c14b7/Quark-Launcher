'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { loadLaunchStats } from '@/lib/play-history';
import {
  buildQuarkRecap,
  formatRecapShareText,
  type QuarkRecapSnapshot,
  type RecapPeriod,
} from '@/lib/recap-stats';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Copy, Check, X, Sparkles } from 'lucide-react';

interface RecapViewProps {
  open: boolean;
  onClose: () => void;
}

export function RecapView({ open, onClose }: RecapViewProps) {
  const t = useTranslations('recap');
  const { games } = useGames();
  const { settings } = useSettings();
  const [period, setPeriod] = useState<RecapPeriod>('allTime');
  const [snap, setSnap] = useState<QuarkRecapSnapshot | null>(null);
  const [slide, setSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlide(0);
    setReady(false);
    void (async () => {
      const stats = await loadLaunchStats();
      setSnap(buildQuarkRecap(games, stats, settings, period));
      setReady(true);
    })();
  }, [open, games, settings, period]);

  const slides = useMemo(() => {
    if (!snap) return [] as { key: string; node: ReactNode }[];
    return [
      {
        key: 'intro',
        node: (
          <div className="flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in-95 duration-500">
            <Sparkles className="h-10 w-10 text-[#d4ff00]" />
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
              {t('title')}
            </h2>
            <p className="text-zinc-400 max-w-md text-sm sm:text-base">
              {period === 'year'
                ? t('introYear', { year: snap.year })
                : period === '30d'
                  ? t('intro30d')
                  : t('introAll')}
            </p>
            <div className="flex gap-2 mt-2">
              {(['allTime', 'year', '30d'] as RecapPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs border transition-colors',
                    period === p
                      ? 'bg-[#d4ff00]/15 border-[#d4ff00]/40 text-[#d4ff00]'
                      : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {t(`period_${p}`)}
                </button>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: 'top',
        node: (
          <SlideShell title={t('slideTopGames')} subtitle={t('slideTopGamesHint')}>
            <div className="grid gap-3 w-full max-w-lg">
              {(snap.topGamesByLaunches.length ? snap.topGamesByLaunches : snap.topGamesByPlaytime)
                .slice(0, 5)
                .map((g, i) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="text-[#d4ff00] font-mono w-6 text-right">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.image}
                      alt=""
                      className="h-12 w-8 rounded object-cover bg-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{g.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {g.launchCount > 0
                          ? t('launches', { count: g.launchCount })
                          : t('hours', { hours: Math.round((g.playtimeMinutes / 60) * 10) / 10 })}
                      </p>
                    </div>
                  </div>
                ))}
              {snap.topGamesByLaunches.length === 0 && snap.topGamesByPlaytime.length === 0 && (
                <p className="text-sm text-zinc-500">{t('emptyGames')}</p>
              )}
            </div>
          </SlideShell>
        ),
      },
      {
        key: 'genres',
        node: (
          <SlideShell title={t('slideGenres')} subtitle={t('slideGenresHint')}>
            <div className="w-full max-w-md space-y-3">
              {snap.topGenres.map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-200">{g.name}</span>
                    <span className="text-zinc-500">{Math.round(g.share * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#d4ff00]/80 transition-all duration-700"
                      style={{ width: `${Math.max(6, Math.round(g.share * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
              {snap.topGenres.length === 0 && (
                <p className="text-sm text-zinc-500">{t('emptyGenres')}</p>
              )}
            </div>
          </SlideShell>
        ),
      },
      {
        key: 'platforms',
        node: (
          <SlideShell title={t('slidePlatforms')} subtitle={t('slidePlatformsHint')}>
            <div className="flex flex-wrap justify-center gap-4 max-w-lg">
              {snap.platforms.map((p) => (
                <div
                  key={p.platform}
                  className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-center min-w-[120px]"
                >
                  <p className="text-2xl font-semibold text-[#d4ff00]">
                    {Math.round(p.share * 100)}%
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 capitalize">{p.platform}</p>
                  <p className="text-[10px] text-zinc-600">{t('gamesCount', { count: p.count })}</p>
                </div>
              ))}
            </div>
          </SlideShell>
        ),
      },
      {
        key: 'streak',
        node: (
          <SlideShell title={t('slideStreak')} subtitle={t('slideStreakHint')}>
            <p className="text-6xl font-semibold text-[#d4ff00] tabular-nums animate-in zoom-in-50 duration-500">
              {snap.streakDays}
            </p>
            <p className="text-sm text-zinc-400 mt-2">{t('streakDays')}</p>
            {snap.mostDedicated && (
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={snap.mostDedicated.image}
                  alt=""
                  className="h-14 w-10 rounded object-cover"
                />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {t('mostDedicated')}
                  </p>
                  <p className="text-sm text-white">{snap.mostDedicated.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {t('launches', { count: snap.mostDedicated.launchCount })}
                  </p>
                </div>
              </div>
            )}
            {snap.favoriteCategory && (
              <p className="text-xs text-zinc-500 mt-4">
                {t('favoriteCategory', {
                  name: snap.favoriteCategory.name,
                  count: snap.favoriteCategory.gameCount,
                })}
              </p>
            )}
          </SlideShell>
        ),
      },
      {
        key: 'share',
        node: (
          <SlideShell title={t('slideShare')} subtitle={t('slideShareHint')}>
            <div className="w-full max-w-md rounded-2xl border border-[#d4ff00]/20 bg-gradient-to-br from-[#d4ff00]/10 to-transparent p-6 text-left space-y-2">
              <p className="text-lg font-semibold text-white">{t('title')}</p>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                {formatRecapShareText(snap)}
              </p>
            </div>
            <Button
              className="mt-6 gap-2 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
              onClick={async () => {
                await navigator.clipboard.writeText(formatRecapShareText(snap));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t('copied') : t('copySummary')}
            </Button>
          </SlideShell>
        ),
      },
    ];
  }, [snap, period, t, copied]);

  if (!open) return null;

  const max = Math.max(0, slides.length - 1);

  return (
    <div className="fixed inset-0 z-[280] flex flex-col bg-[#050508] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,255,0,0.18), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.12), transparent)',
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5">
        <p className="text-xs font-medium tracking-wide text-zinc-400">{t('title')}</p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-8 min-h-0">
        {!ready || !snap ? (
          <p className="text-sm text-zinc-500">{t('loading')}</p>
        ) : (
          slides[slide]?.node
        )}
      </div>

      <footer className="relative z-10 flex items-center justify-between px-4 py-4 border-t border-white/5">
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 gap-1"
          disabled={slide <= 0}
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('prev')}
        </Button>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={s.key}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === slide ? 'w-6 bg-[#d4ff00]' : 'w-1.5 bg-white/20'
              )}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 gap-1"
          disabled={slide >= max}
          onClick={() => setSlide((s) => Math.min(max, s + 1))}
        >
          {t('next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}

function SlideShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-400">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500 mt-2">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
