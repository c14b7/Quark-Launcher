'use client';

import { useState, useEffect, useRef, type ComponentType } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { UserCard } from './user-card';
import { GRADIENT_PRESETS } from '@/lib/friends-service';
import type { CardTheme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Camera, Loader2, Sparkles, User, Palette } from 'lucide-react';
import { uploadAvatar, deleteAvatar, getAvatarUrl } from '@/lib/avatar-service';
import { useTranslations } from 'next-intl';

const GRADIENT_OPTIONS = Object.keys(GRADIENT_PRESETS);

function SettingSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProfileEditor() {
  const t = useTranslations('profile');
  const { profile, updateProfile, cardTheme } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [theme, setTheme] = useState<CardTheme>(cardTheme);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || profile.name);
      setBio(profile.bio || '');
      setCustomStatus(profile.customStatus || '');
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
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);

    const upload = await uploadAvatar(file);
    if (!upload.success || !upload.fileId) {
      setUploading(false);
      setAvatarPreview(getAvatarUrl(profile.avatarFileId));
      setMessage(upload.error || t('avatarUploadError'));
      return;
    }

    if (profile.avatarFileId) {
      await deleteAvatar(profile.avatarFileId);
    }

    const result = await updateProfile({ avatarFileId: upload.fileId });
    setUploading(false);

    if (result.success) {
      setAvatarFileId(upload.fileId);
      setMessage(t('avatarSaved'));
    } else {
      setAvatarPreview(getAvatarUrl(profile.avatarFileId));
      setMessage(result.error || t('saveError'));
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({
      displayName,
      bio,
      customStatus,
      cardTheme: theme,
    });
    setSaving(false);
    setMessage(result.success ? t('saved') : result.error || t('saveError'));
  };

  if (!profile) return null;

  const previewProfile = {
    ...profile,
    displayName,
    bio,
    customStatus,
    cardTheme: JSON.stringify(theme),
    avatarFileId,
  };

  const initials = (displayName || profile.name).slice(0, 2).toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <SettingSection title={t('avatarSection')} description={t('avatarHint')} icon={Camera}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative shrink-0"
            >
              <Avatar className="h-20 w-20 border-2 border-violet-500/30">
                {avatarPreview && <AvatarImage src={avatarPreview} alt={displayName} />}
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </span>
            </button>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? t('uploading') : t('changeAvatar')}
              </Button>
              <p className="text-xs text-zinc-500">{t('avatarFormats')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
        </SettingSection>

        <SettingSection title={t('basicSection')} description={t('basicHint')} icon={User}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">{t('displayName')}</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                className="rounded-xl bg-zinc-800/60 border-white/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">{t('bio')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={190}
                rows={3}
                className="w-full rounded-xl bg-zinc-800/60 border border-white/10 px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-xs text-zinc-600 mt-1 text-right">{bio.length}/190</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">{t('status')}</label>
              <Input
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                maxLength={128}
                placeholder={t('statusPlaceholder')}
                className="rounded-xl bg-zinc-800/60 border-white/10"
              />
            </div>
          </div>
        </SettingSection>

        <SettingSection title={t('appearanceSection')} description={t('appearanceHint')} icon={Palette}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">{t('accentColor')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  className="h-10 w-14 rounded-lg cursor-pointer bg-transparent border border-white/10"
                />
                <span className="text-xs font-mono text-zinc-500">{theme.accentColor}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">{t('bannerGradient')}</label>
              <div className="flex flex-wrap gap-2">
                {GRADIENT_OPTIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTheme({ ...theme, gradientPreset: preset })}
                    className={cn(
                      'h-9 w-14 rounded-lg bg-gradient-to-r transition-transform hover:scale-105',
                      GRADIENT_PRESETS[preset],
                      theme.gradientPreset === preset && 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                    )}
                    aria-label={preset}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={theme.glowEnabled ?? false}
                onChange={(e) => setTheme({ ...theme, glowEnabled: e.target.checked })}
                className="rounded accent-violet-500"
              />
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Sparkles className="h-4 w-4 text-violet-400" />
                {t('glowEffect')}
              </div>
            </label>
          </div>
        </SettingSection>

        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
        >
          {saving ? t('saving') : t('saveProfile')}
        </Button>
        {message && (
          <p
            className={cn(
              'text-sm text-center',
              message === t('saved') || message === t('avatarSaved') ? 'text-green-400' : 'text-red-400'
            )}
          >
            {message}
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-0 lg:self-start space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t('preview')}</p>
        <UserCard profile={previewProfile} avatarUrl={avatarPreview} />
      </div>
    </div>
  );
}
