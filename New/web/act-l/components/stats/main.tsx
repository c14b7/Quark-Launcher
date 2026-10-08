'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChartNoAxesCombined,
  Flame,
  Gamepad2,
  Clock,
  Sparkles,
  RefreshCw,
  Shield,
  ShieldOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGames } from '@/lib/games-context';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { loadLaunchStats } from '@/lib/play-history';
import { loadPlaySessions } from '@/lib/play-session-tracker';
import {
  buildQuarkStats,
  formatDuration,
  type QuarkStatsSnapshot,
  type StatsPeriod,
} from '@/lib/stats-engine';
import {
  setStatsSyncContext,
  syncStatsNow,
  updateStatsVisibility,
  type StatsVisibility,
} from '@/lib/stats-sync-service';
import { getProfileDisplayPrefs, mergeProfilePreferences } from '@/lib/profile-preferences';
import { cn } from '@/lib/utils';

const PERIODS: StatsPeriod[] = ['7d', '30d', 'year', 'allTime'];
const WEEKDAY_KEYS = ['wdSun', 'wdMon', 'wdTue', 'wdWed', 'wdThu', 'wdFri', 'wdSat'] as const;

export function StatsView() {
  const t = useTranslations('stats');
  const { games } = useGames();
  const { settings } = useSettings();
  const { profile, updateProfile } = useAuth();
  const [period, setPeriod] = useState<StatsPeriod>('30d');
  const [snap, setSnap] = useState<QuarkStatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [visibility, setVisibility] = useState<StatsVisibility>('friends');
  const [topMode, setTopMode] = useState<'session' | 'launches' | 'steam'>('session');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [launchStats, sessions] = await Promise.all([loadLaunchStats(), loadPlaySessions()]);
    setStatsSyncContext({
      games,
      settings,
      preferences: profile?.preferences,
      visibility,
    });
    setSnap(buildQuarkStats(games, launchStats, sessions, settings, period));
    setLoading(false);
  }, [games, settings, period, profile?.preferences, visibility]);

  useEffect(() => {
    const prefs = getProfileDisplayPrefs(profile?.preferences);
    setVisibility(prefs.statsVisibility || 'friends');
  }, [profile?.preferences]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setStatsSyncContext({ games, settings, preferences: profile?.preferences, visibility });
    scheduleIdleSync();
  }, [games, settings, profile?.preferences, visibility]);

  const scheduleIdleSync = () => {
    void syncStatsNow(visibility);
  };

  const toggleVisibility = async () => {
    const next: StatsVisibility = visibility === 'friends' ? 'private' : 'friends';
    setVisibility(next);
    setSyncing(true);
    await updateStatsVisibility(next);
    if (profile) {
      await updateProfile({
        preferences: mergeProfilePreferences(profile.preferences, { statsVisibility: next }),
      });
    }
    setSyncing(false);
  };

  const openRecap = () => window.dispatchEvent(new CustomEvent('quark-open-recap'));

  const maxHour = Math.max(1, ...(snap?.hourHistogram.map((h) => h.count) || [1]));
  const maxWeek = Math.max(1, ...(snap?.weekdayBars.map((d) => d.sessionSec || d.count) || [1]));

  const topRows =
    topMode === 'launches'
      ? snap?.topGamesByLaunches
      : topMode === 'steam'
        ? snap?.topGamesByPlaytime
        : snap?.topGamesBySession;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="content-shell space-y-6 pb-16 pt-4">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#d4ff00]">
              <ChartNoAxesCombined className="h-5 w-5" />
              <p className="text-xs uppercase tracking-wider font-medium">{t('eyebrow')}</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-1 tracking-tight">
              {t('title')}
            </h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-lg">{t('subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 gap-1.5"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              {t('refresh')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 gap-1.5"
              onClick={() => void toggleVisibility()}
              disabled={syncing}
            >
              {visibility === 'friends' ? (
                <Shield className="h-3.5 w-3.5 text-lime-400" />
              ) : (
                <ShieldOff className="h-3.5 w-3.5 text-zinc-500" />
              )}
              {visibility === 'friends' ? t('visibilityFriends') : t('visibilityPrivate')}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
              onClick={openRecap}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('openRecap')}
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
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

        {!snap || (snap.totalLaunches === 0 && snap.recentSessions.length === 0) ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 px-6 py-14 text-center space-y-3">
            <Gamepad2 className="h-12 w-12 text-zinc-700 mx-auto" />
            <p className="text-lg text-zinc-300">{t('emptyTitle')}</p>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">{t('emptyHint')}</p>
            <Button
              className="mt-2 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
              onClick={() => window.dispatchEvent(new CustomEvent('quark-navigate', { detail: 'library' }))}
            >
              {t('emptyCta')}
            </Button>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<Gamepad2 className="h-4 w-4" />}
                label={t('metricLaunches')}
                value={String(snap.totalLaunches)}
              />
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                label={t('metricSessionHours')}
                value={`~${snap.totalSessionHours}h`}
              />
              <StatCard
                icon={<Flame className="h-4 w-4" />}
                label={t('metricStreak')}
                value={String(snap.streakDays)}
              />
              <StatCard
                icon={<ChartNoAxesCombined className="h-4 w-4" />}
                label={t('metricSteam')}
                value={`~${snap.totalSteamHours}h`}
              />
            </section>

            {snap.insights.length > 0 && (
              <section className="rounded-2xl border border-[#d4ff00]/20 bg-[#d4ff00]/5 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-[#d4ff00]/80 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('insights')}
                </p>
                <ul className="space-y-1.5">
                  {snap.insights.map((i) => (
                    <li key={i.id} className="text-sm text-zinc-200">
                      {formatInsight(t, i)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-white">{t('topGames')}</h2>
                  <div className="flex gap-1">
                    {(['session', 'launches', 'steam'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTopMode(m)}
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full border',
                          topMode === m
                            ? 'border-[#d4ff00]/40 text-[#d4ff00]'
                            : 'border-white/10 text-zinc-500'
                        )}
                      >
                        {t(`topMode_${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {(topRows || []).slice(0, 6).map((g, i) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <span className="text-[#d4ff00] font-mono text-xs w-4">{i + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.image} alt="" className="h-10 w-7 rounded object-cover bg-zinc-800" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{g.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {topMode === 'steam'
                            ? t('hours', { hours: Math.round((g.playtimeMinutes / 60) * 10) / 10 })
                            : topMode === 'launches'
                              ? t('launches', { count: g.launchCount })
                              : formatDuration(g.sessionSec)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(topRows || []).length === 0 && (
                    <p className="text-xs text-zinc-500 py-4 text-center">{t('noTop')}</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 space-y-3">
                <h2 className="text-sm font-medium text-white">{t('timeline')}</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {snap.recentSessions.slice(0, 20).map((s) => {
                    const game = games.find((g) => g.id === s.gameId);
                    return (
                      <div key={s.id} className="flex items-center gap-3 text-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={game?.capsule || game?.image || ''}
                          alt=""
                          className="h-9 w-6 rounded object-cover bg-zinc-800"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-zinc-200 truncate">{s.gameName || game?.name || s.gameId}</p>
                          <p className="text-zinc-600">
                            {new Date(s.startedAt).toLocaleString()}
                            {s.durationSec != null ? ` · ${formatDuration(s.durationSec)}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {snap.recentSessions.length === 0 && (
                    <p className="text-xs text-zinc-500 py-4 text-center">{t('noSessions')}</p>
                  )}
                </div>
              </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 space-y-3">
                <h2 className="text-sm font-medium text-white">{t('byHour')}</h2>
                <div className="flex items-end gap-0.5 h-24">
                  {snap.hourHistogram.map((h) => (
                    <div
                      key={h.hour}
                      className="flex-1 rounded-t bg-[#d4ff00]/70 min-w-0 transition-all"
                      style={{ height: `${Math.max(4, (h.count / maxHour) * 100)}%` }}
                      title={`${h.hour}:00 — ${h.count}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600">{t('byHourHint')}</p>
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 space-y-3">
                <h2 className="text-sm font-medium text-white">{t('byWeekday')}</h2>
                <div className="space-y-2">
                  {snap.weekdayBars.map((d) => (
                    <div key={d.day} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-zinc-500">{t(WEEKDAY_KEYS[d.day])}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#d4ff00]/80"
                          style={{
                            width: `${Math.max(4, ((d.sessionSec || d.count) / maxWeek) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 space-y-3">
                <h2 className="text-sm font-medium text-white">{t('genres')}</h2>
                {snap.topGenres.map((g) => (
                  <div key={g.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-200">{g.name}</span>
                      <span className="text-zinc-500">{Math.round(g.share * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-violet-400/80"
                        style={{ width: `${Math.max(6, Math.round(g.share * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
                {snap.topGenres.length === 0 && (
                  <p className="text-xs text-zinc-500">{t('noGenres')}</p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
                <h2 className="text-sm font-medium text-white mb-3">{t('platforms')}</h2>
                <div className="flex flex-wrap gap-2">
                  {snap.platforms.map((p) => (
                    <Badge
                      key={p.platform}
                      variant="outline"
                      className="border-white/10 text-zinc-300 capitalize"
                    >
                      {p.platform} · {Math.round(p.share * 100)}%
                    </Badge>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatInsight(
  t: ReturnType<typeof useTranslations<'stats'>>,
  i: { key: string; values?: Record<string, string | number>; text: string }
) {
  try {
    return t(i.key as 'insightDedicated', i.values);
  } catch {
    return i.text;
  }
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 animate-in fade-in">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{value}</p>
    </div>
  );
}
