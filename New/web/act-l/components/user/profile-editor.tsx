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
import { Camera, Loader2, MapPin, AtSign } from 'lucide-react';
import { uploadAvatar, getAvatarUrl, fileToPreviewUrl } from '@/lib/avatar-service';
import {
  getProfileDisplayPrefs,
  mergeProfilePreferences,
} from '@/lib/profile-preferences';
import { useTranslations } from 'next-intl';

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
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [location, setLocation] = useState('');
  const [showMemberSince, setShowMemberSince] = useState(true);
  const [presence, setPresence] = useState<string>('online');
  const [theme, setTheme] = useState<CardTheme>(cardTheme);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      const prefs = getProfileDisplayPrefs(profile.preferences);
      setDisplayName(profile.displayName || profile.name);
      setBio(profile.bio || '');
      setCustomStatus(profile.customStatus || '');
      setPronouns(prefs.pronouns || '');
      setLocation(prefs.location || '');
      setShowMemberSince(prefs.showMemberSince !== false);
      setPresence(profile.presence || 'online');
      setTheme(cardTheme);
      setAvatarFileId(profile.avatarFileId ?? null);
      setAvatarPreview(getAvatarUrl(profile.avatarFileId));
    }
  }, [profile, cardTheme]);

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
  };

  const initials = (displayName || profile.name).slice(0, 2).toUpperCase();
  const isSuccess = message === t('saved') || message === t('avatarSaved');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      {/* Preview — mobile first */}
      <div className="lg:hidden space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('preview')}</p>
        <UserCard3D className="mx-auto max-w-[260px]">
          <UserCard profile={previewProfile} avatarUrl={avatarPreview} showMemberSince={showMemberSince} />
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
          <Button onClick={handleSave} disabled={saving || uploading} className="w-full sm:w-auto">
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
            <UserCard profile={previewProfile} avatarUrl={avatarPreview} showMemberSince={showMemberSince} />
          </UserCard3D>
          <p className="text-[11px] text-muted-foreground text-center">{t('previewHint')}</p>
        </div>
      </div>
    </div>
  );
}
