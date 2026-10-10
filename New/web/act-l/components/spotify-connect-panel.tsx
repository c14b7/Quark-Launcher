'use client';

import { useCallback, useEffect, useState } from 'react';
import { Music2, Link2, Unlink, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { getProfileDisplayPrefs, mergeProfilePreferences } from '@/lib/profile-preferences';
import {
  completeSpotifyCallback,
  getSpotifyAuthUrl,
  getSpotifyStatus,
  unlinkSpotify,
} from '@/lib/spotify-service';
import { cn } from '@/lib/utils';

export function SpotifyConnectPanel() {
  const t = useTranslations('spotify');
  const { profile, updateProfile } = useAuth();
  const [configured, setConfigured] = useState(true);
  const [linked, setLinked] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const shareListening =
    getProfileDisplayPrefs(profile?.preferences).shareListening !== 'private';

  const refresh = useCallback(async () => {
    const r = await getSpotifyStatus();
    if (!r.success) return;
    setConfigured(r.configured !== false);
    setLinked(Boolean(r.linked));
    setDisplayName(r.displayName);
    if (r.hint) setHint(r.hint);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onCb = (e: Event) => {
      const detail = (e as CustomEvent<{ code?: string; verifier?: string }>).detail;
      if (!detail?.code || !detail?.verifier) return;
      setBusy(true);
      void completeSpotifyCallback(detail.code, detail.verifier).then(() => {
        setBusy(false);
        void refresh();
      });
    };
    window.addEventListener('quark-spotify-callback', onCb);
    return () => window.removeEventListener('quark-spotify-callback', onCb);
  }, [refresh]);

  const connect = async () => {
    setBusy(true);
    setHint(null);
    const r = await getSpotifyAuthUrl();
    if (!r.success || !r.url || !r.verifier) {
      setHint(r.error || t('notConfigured'));
      setBusy(false);
      return;
    }
    sessionStorage.setItem('quark-spotify-verifier', r.verifier);
    sessionStorage.setItem('quark-spotify-state', r.state || '');
    if (window.electronAPI?.spotifyStartOAuth) {
      const result = await window.electronAPI.spotifyStartOAuth(r.url, r.verifier);
      if (result?.success && result.code) {
        await completeSpotifyCallback(result.code, r.verifier);
        await refresh();
      } else if (result?.error) {
        setHint(result.error);
      }
    } else {
      window.open(r.url, '_blank');
      setHint(t('browserHint'));
    }
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true);
    await unlinkSpotify();
    await refresh();
    setBusy(false);
  };

  const toggleShare = async () => {
    if (!profile) return;
    const next = shareListening ? 'private' : 'friends';
    await updateProfile({
      preferences: mergeProfilePreferences(profile.preferences, { shareListening: next }),
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Music2 className="h-4 w-4 text-[#d4ff00]" />
        <h2 className="text-sm font-medium text-white">{t('title')}</h2>
      </div>
      <p className="text-xs text-zinc-500">{t('desc')}</p>
      {!configured && (
        <p className="text-xs text-amber-300/90 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          {hint || t('notConfigured')}
        </p>
      )}
      {linked ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-zinc-300 flex-1">
            {t('linkedAs', { name: displayName || 'Spotify' })}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 gap-1.5"
            disabled={busy}
            onClick={() => void disconnect()}
          >
            <Unlink className="h-3.5 w-3.5" />
            {t('unlink')}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="gap-1.5 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
          disabled={busy || !configured}
          onClick={() => void connect()}
        >
          <Link2 className="h-3.5 w-3.5" />
          {t('connect')}
        </Button>
      )}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <Shield className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-white">{t('shareLabel')}</p>
            <p className="text-[11px] text-zinc-500">{t('shareDesc')}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'rounded-xl min-w-[4.5rem] shrink-0',
            shareListening && 'border-[#d4ff00]/40 text-[#d4ff00]'
          )}
          onClick={() => void toggleShare()}
        >
          {shareListening ? t('shareOn') : t('shareOff')}
        </Button>
      </div>
      {hint && configured && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </section>
  );
}
