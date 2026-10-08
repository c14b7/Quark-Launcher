'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { UserCard } from './user-card';
import { UserCard3D } from './user-card-3d';
import { GRADIENT_PRESETS } from '@/lib/friends-service';
import type { CardTheme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Camera, Loader2, MapPin, AtSign, Search, ImageIcon } from 'lucide-react';
import { uploadAvatar, uploadBanner, getAvatarUrl, getBannerUrl, fileToPreviewUrl } from '@/lib/avatar-service';
import {
  getProfileDisplayPrefs,
  mergeProfilePreferences,
} from '@/lib/profile-preferences';
import { useTranslations } from 'next-intl';
import { useGames } from '@/lib/games-context';
import { loadLaunchStats } from '@/lib/play-history';

const GRADIENT_OPTIONS = Object.keys(GRADIENT_PRESETS);
const PRESENCE_OPTIONS = ['online', 'idle', 'dnd', 'offline'] as const;
const BORDER_OPTIONS: CardTheme['borderStyle'][] = ['default', 'minimal', 'accent'];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export function ProfileEditor() {
  const t = useTranslations('profile');
  const { profile, updateProfile, cardTheme, applyProfile } = useAuth();
  const { games } = useGames();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [location, setLocation] = useState('');
  const [motto, setMotto] = useState('');
  const [favoriteGameId, setFavoriteGameId] = useState('');
  const [favoriteGameName, setFavoriteGameName] = useState('');
  const [favoriteGameImage, setFavoriteGameImage] = useState('');
  const [showPlayStats, setShowPlayStats] = useState(true);
  const [gameSearch, setGameSearch] = useState('');
  const [showMemberSince, setShowMemberSince] = useState(true);
  const [presence, setPresence] = useState<string>('online');
  const [theme, setTheme] = useState<CardTheme>(cardTheme);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
  const [bannerFileId, setBannerFileId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [bannerPreview, setBannerPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [launchCount, setLaunchCount] = useState(0);
  const [steamHours, setSteamHours] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      const prefs = getProfileDisplayPrefs(profile.preferences);
      setDisplayName(profile.displayName || profile.name);
      setBio(profile.bio || '');
      setCustomStatus(profile.customStatus || '');
      setPronouns(prefs.pronouns || '');
      setLocation(prefs.location || '');
      setMotto(prefs.showcase?.motto || '');
      setFavoriteGameId(prefs.showcase?.favoriteGameId || '');
      setFavoriteGameName(prefs.showcase?.favoriteGameName || '');
      setFavoriteGameImage(prefs.showcase?.favoriteGameImage || '');
      setShowPlayStats(prefs.showcase?.showPlayStats !== false);
      setShowMemberSince(prefs.showMemberSince !== false);
      setPresence(profile.presence || 'online');
      setTheme(cardTheme);
      setAvatarFileId(profile.avatarFileId ?? null);
      setBannerFileId(profile.bannerFileId ?? null);
      setAvatarPreview(getAvatarUrl(profile.avatarFileId));
      setBannerPreview(getBannerUrl(profile.bannerFileId));
    }
  }, [profile, cardTheme]);

  useEffect(() => {
    void (async () => {
      const stats = await loadLaunchStats();
      const total = Object.values(stats).reduce((s, g) => s + (g.launchCount || 0), 0);
      setLaunchCount(total);
      const mins = games.reduce((s, g) => s + (g.playtime || 0), 0);
      setSteamHours(Math.round((mins / 60) * 10) / 10);
    })();
  }, [games]);

  const filteredGames = games
    .filter((g) => !gameSearch || g.name.toLowerCase().includes(gameSearch.toLowerCase()))
    .slice(0, 12);

  const pickFavorite = (id: string) => {
    const g = games.find((x) => x.id === id);
    if (!g) return;
    setFavoriteGameId(g.id);
    setFavoriteGameName(g.name);
    setFavoriteGameImage(g.capsule || g.image || '');
    setGameSearch('');
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      setMessage(t('avatarInvalid'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage(t('avatarTooLarge'));
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      setAvatarPreview(await fileToPreviewUrl(file));
      const upload = await uploadAvatar(file);
      if (!upload.success || !upload.fileId) {
        setAvatarPreview(getAvatarUrl(profile.avatarFileId));
        setMessage(upload.error || t('avatarUploadError'));
        return;
      }
      if (upload.profile) applyProfile(upload.profile);
      setAvatarFileId(upload.fileId);
      setAvatarPreview(upload.avatarUrl || getAvatarUrl(upload.fileId));
      setMessage(t('avatarSaved'));
    } catch {
      setAvatarPreview(getAvatarUrl(profile.avatarFileId));
      setMessage(t('avatarUploadError'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBannerPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      setMessage(t('avatarInvalid'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage(t('avatarTooLarge'));
      return;
    }
    setUploadingBanner(true);
    setMessage(null);
    try {
      setBannerPreview(await fileToPreviewUrl(file));
      const upload = await uploadBanner(file);
      if (!upload.success || !upload.fileId) {
        setBannerPreview(getBannerUrl(profile.bannerFileId));
        setMessage(upload.error || t('bannerUploadError'));
        return;
      }
      if (upload.profile) applyProfile(upload.profile);
      setBannerFileId(upload.fileId);
      setBannerPreview(upload.bannerUrl || getBannerUrl(upload.fileId));
      setMessage(t('bannerSaved'));
    } catch {
      setBannerPreview(getBannerUrl(profile.bannerFileId));
      setMessage(t('bannerUploadError'));
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const result = await updateProfile({
      displayName,
      bio,
      customStatus,
      presence,
      cardTheme: theme,
      preferences: mergeProfilePreferences(profile.preferences, {
        pronouns: pronouns.trim().slice(0, 24),
        location: location.trim().slice(0, 48),
        showMemberSince,
        showcase: {
          motto: motto.trim().slice(0, 80),
          favoriteGameId: favoriteGameId || undefined,
          favoriteGameName: favoriteGameName || undefined,
          favoriteGameImage: favoriteGameImage || undefined,
          showPlayStats,
        },
      }),
    });

    setSaving(false);
    setMessage(result.success ? t('saved') : result.error || t('saveError'));
  };

  if (!profile) return null;

  const previewPreferences = mergeProfilePreferences(profile.preferences, {
    pronouns: pronouns.trim(),
    location: location.trim(),
    showMemberSince,
    showcase: {
      motto: motto.trim(),
      favoriteGameId: favoriteGameId || undefined,
      favoriteGameName: favoriteGameName || undefined,
      favoriteGameImage: favoriteGameImage || undefined,
      showPlayStats,
    },
  });

  const previewProfile = {
    ...profile,
    displayName,
    bio,
    customStatus,
    presence: presence as typeof profile.presence,
    pronouns: pronouns.trim(),
    location: location.trim(),
    preferences: previewPreferences,
    cardTheme: JSON.stringify(theme),
    avatarFileId,
    bannerFileId,
  };

  const initials = (displayName || profile.name).slice(0, 2).toUpperCase();
  const isSuccess =
    message === t('saved') || message === t('avatarSaved') || message === t('bannerSaved');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      {/* Preview — mobile first */}
      <div className="lg:hidden space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('preview')}</p>
        <UserCard3D className="mx-auto max-w-[260px]">
          <UserCard
            profile={previewProfile}
            avatarUrl={avatarPreview}
            bannerUrl={bannerPreview}
            showMemberSince={showMemberSince}
            launchCount={showPlayStats ? launchCount : undefined}
            steamHours={showPlayStats ? steamHours : undefined}
          />
        </UserCard3D>
      </div>

      <div className="space-y-6 min-w-0">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-16 w-16 border border-border">
              {avatarPreview && <AvatarImage src={avatarPreview} alt={displayName} />}
              <AvatarFallback className="bg-muted text-foreground font-medium">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
              ) : (
                <Camera className="h-4 w-4 text-foreground" />
              )}
            </span>
          </button>
          <div className="min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? t('uploading') : t('changeAvatar')}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t('avatarFormats')}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarPick}
          />
        </div>

        {/* Banner upload */}
        <Field label={t('profileBanner')} hint={t('profileBannerHint')}>
          <div className="flex items-center gap-3">
            <div
              className="h-14 flex-1 rounded-lg border border-border bg-muted/40 overflow-hidden bg-cover bg-center"
              style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={uploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
            >
              {uploadingBanner ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              {t('changeBanner')}
            </Button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleBannerPick}
            />
          </div>
        </Field>

        <Separator />

        {/* Identity */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">{t('basicSection')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('displayName')}>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} />
            </Field>
            <Field label={t('pronouns')} hint={t('pronounsHint')}>
              <div className="relative">
                <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  maxLength={24}
                  placeholder={t('pronounsPlaceholder')}
                  className="pl-8"
                />
              </div>
            </Field>
          </div>
          <Field label={t('bio')}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={190}
              rows={3}
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">{bio.length}/190</p>
          </Field>
          <Field label={t('motto')} hint={t('mottoHint')}>
            <Input
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              maxLength={80}
              placeholder={t('mottoPlaceholder')}
            />
            <p className="text-[11px] text-muted-foreground text-right">{motto.length}/80</p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('status')}>
              <Input
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                maxLength={128}
                placeholder={t('statusPlaceholder')}
              />
            </Field>
            <Field label={t('location')} hint={t('locationHint')}>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={48}
                  placeholder={t('locationPlaceholder')}
                  className="pl-8"
                />
              </div>
            </Field>
          </div>
        </div>

        <Separator />

        {/* Showcase */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t('showcaseSection')}</p>
          <Field label={t('favoriteGame')} hint={t('favoriteGameHint')}>
            {favoriteGameName && (
              <div className="flex items-center gap-2 mb-2 rounded-md border border-border px-2 py-1.5">
                {favoriteGameImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favoriteGameImage} alt="" className="h-8 w-6 rounded object-cover" />
                )}
                <span className="text-sm flex-1 truncate">{favoriteGameName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setFavoriteGameId('');
                    setFavoriteGameName('');
                    setFavoriteGameImage('');
                  }}
                >
                  {t('clearFavorite')}
                </Button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                placeholder={t('searchGames')}
                className="pl-8"
              />
            </div>
            {gameSearch && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {filteredGames.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted/50"
                    onClick={() => pickFavorite(g.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.capsule || g.image} alt="" className="h-7 w-5 rounded object-cover" />
                    <span className="truncate">{g.name}</span>
                  </button>
                ))}
                {filteredGames.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">{t('noGamesFound')}</p>
                )}
              </div>
            )}
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
            <span className="text-sm text-foreground">{t('showPlayStats')}</span>
            <input
              type="checkbox"
              checked={showPlayStats}
              onChange={(e) => setShowPlayStats(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
          </label>
        </div>

        <Separator />

        {/* Presence */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t('presence')}</p>
          <div className="flex flex-wrap gap-2">
            {PRESENCE_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPresence(p)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  presence === p
                    ? 'border-foreground/20 bg-secondary text-foreground'
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    p === 'online' && 'bg-emerald-500',
                    p === 'idle' && 'bg-amber-500',
                    p === 'dnd' && 'bg-red-500',
                    p === 'offline' && 'bg-zinc-500'
                  )}
                />
                {t(`presence_${p}`)}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Appearance */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">{t('appearanceSection')}</p>
          <Field label={t('accentColor')}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                className="h-9 w-12 rounded-md border border-input cursor-pointer bg-transparent p-0.5"
              />
              <span className="text-xs font-mono text-muted-foreground">{theme.accentColor}</span>
            </div>
          </Field>
          <Field label={t('bannerGradient')}>
            <div className="flex flex-wrap gap-2">
              {GRADIENT_OPTIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTheme({ ...theme, gradientPreset: preset })}
                  className={cn(
                    'h-8 w-12 rounded-md bg-gradient-to-r ring-offset-background transition-all',
                    GRADIENT_PRESETS[preset],
                    theme.gradientPreset === preset
                      ? 'ring-2 ring-foreground ring-offset-2'
                      : 'opacity-80 hover:opacity-100'
                  )}
                  aria-label={preset}
                />
              ))}
            </div>
          </Field>
          <Field label={t('cardBorder')}>
            <div className="flex gap-2">
              {BORDER_OPTIONS.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setTheme({ ...theme, borderStyle: style })}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors',
                    (theme.borderStyle || 'default') === style
                      ? 'border-foreground/30 bg-secondary text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {t(`border_${style}`)}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
            <span className="text-sm text-foreground">{t('glowEffect')}</span>
            <input
              type="checkbox"
              checked={theme.glowEnabled ?? false}
              onChange={(e) => setTheme({ ...theme, glowEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
            <span className="text-sm text-foreground">{t('showMemberSince')}</span>
            <input
              type="checkbox"
              checked={showMemberSince}
              onChange={(e) => setShowMemberSince(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-foreground"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || uploading || uploadingBanner} className="w-full sm:w-auto">
            {saving ? t('saving') : t('saveProfile')}
          </Button>
          {message && (
            <p className={cn('text-sm', isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Preview — desktop */}
      <div className="hidden lg:block">
        <div className="sticky top-0 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">{t('preview')}</p>
          <UserCard3D>
            <UserCard
              profile={previewProfile}
              avatarUrl={avatarPreview}
              bannerUrl={bannerPreview}
              showMemberSince={showMemberSince}
              launchCount={showPlayStats ? launchCount : undefined}
              steamHours={showPlayStats ? steamHours : undefined}
            />
          </UserCard3D>
          <p className="text-[11px] text-muted-foreground text-center">{t('previewHint')}</p>
        </div>
      </div>
    </div>
  );
}
