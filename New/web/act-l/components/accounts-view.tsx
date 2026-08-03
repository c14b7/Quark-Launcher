'use client';

import {
  Pencil,
  LogOut,
  Mail,
  Link2,
  Shield,
  Users,
  Gamepad2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { SteamIntegrationPanel } from '@/components/steam-integration-panel';
import { FriendCodeDisplay } from '@/components/user/friend-code-display';
import { getAvatarUrl } from '@/lib/avatar-service';
import { getAppVersion } from '@/lib/build-env';
import { isPremiumUser } from '@/lib/subscription';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AccountsViewProps {
  onOpenProfileEdit?: () => void;
}

const COMING_SOON_PLATFORMS = [
  { id: 'epic', name: 'Epic Games', hint: 'Biblioteka + free games' },
  { id: 'xbox', name: 'Xbox', hint: 'Game Pass / PC' },
  { id: 'gog', name: 'GOG Galaxy', hint: 'DRM-free' },
];

export function AccountsView({ onOpenProfileEdit }: AccountsViewProps) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const { user, profile, subscription, logout, isLoading, regenerateFriendCode, steamIntegration } =
    useAuth();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const email = profile?.email || user?.email || '';
  const premium = isPremiumUser(subscription);
  const avatarUrl = getAvatarUrl(profile?.avatarFileId);
  const displayName = profile?.displayName || profile?.name || t('guest');
  const initials = displayName.slice(0, 2).toUpperCase();
  const steamLinked = !!(profile?.steamLinked || steamIntegration?.steamId);

  const copyEmail = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-semibold tracking-tight text-white">{t('title')}</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5 pb-14">
          {profile && !profile.emailVerified && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <Mail className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{t('emailVerifyHint')}</p>
            </div>
          )}

          {/* Hero profile */}
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <div
              className="absolute inset-x-0 top-0 h-24 opacity-60"
              style={{
                background: profile?.cardTheme
                  ? undefined
                  : 'linear-gradient(120deg, rgba(212,255,0,0.25), rgba(139,92,246,0.2), transparent)',
              }}
            />
            <div className="relative p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <Avatar className="h-20 w-20 border-2 border-lime-500/40 shadow-lg shadow-lime-500/10">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-zinc-800 text-lg text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-white truncate">{displayName}</h2>
                    <Badge
                      className={cn(
                        'text-[10px]',
                        premium
                          ? 'bg-violet-500/20 text-violet-200 border-violet-500/30'
                          : 'bg-white/5 text-zinc-300 border-white/10'
                      )}
                      variant="outline"
                    >
                      {premium ? t('planPremium') : t('planFree')}
                    </Badge>
                  </div>
                  {profile?.customStatus && (
                    <p className="text-sm text-zinc-400 truncate">{profile.customStatus}</p>
                  )}
                  {profile?.bio && (
                    <p className="text-xs text-zinc-500 line-clamp-2">{profile.bio}</p>
                  )}
                </div>
                <Button
                  onClick={() => onOpenProfileEdit?.()}
                  className="gap-2 bg-lime-500 hover:bg-lime-600 text-black shrink-0"
                  size="sm"
                >
                  <Pencil className="h-4 w-4" />
                  {t('editProfile')}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {t('emailLabel')}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-zinc-200 truncate flex-1">{email || '—'}</p>
                    {email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => void copyEmail()}
                      >
                        {copiedEmail ? (
                          <Check className="h-3 w-3 text-lime-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> {t('presenceLabel')}
                  </p>
                  <p className="text-xs text-zinc-200 mt-1 capitalize">
                    {profile?.presence || 'offline'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Gamepad2 className="h-3 w-3" /> Steam
                  </p>
                  <p className={cn('text-xs mt-1', steamLinked ? 'text-lime-400' : 'text-zinc-500')}>
                    {steamLinked ? t('steamConnected') : t('steamNotConnected')}
                  </p>
                </div>
              </div>

              {profile?.friendCode && (
                <div className="rounded-xl border border-lime-500/20 bg-lime-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-lime-400/80 mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {t('friendCodeSection')}
                  </p>
                  <FriendCodeDisplay
                    code={profile.friendCode}
                    glowEnabled={false}
                    onRegenerate={async () => {
                      await regenerateFriendCode();
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Quick tips */}
 {/*          <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
            <p className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-lime-400" />
              {t('quickTipsTitle')}
            </p>
            <ul className="text-xs text-zinc-500 space-y-1.5 list-disc pl-4">
              <li>{t('tipProfile')}</li>
              <li>{t('tipSteam')}</li>
              <li>{t('tipFriends')}</li>
            </ul>
          </section> */}

          {/* Steam */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-white">{t('integrationsSection')}</h2>
            </div>
            <div className="p-4">
              <SteamIntegrationPanel compact />
            </div>
          </section>

          {/* Coming soon */}
          <section className="rounded-2xl border border-white/8 bg-zinc-950/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <h2 className="text-sm font-medium text-zinc-400">{t('morePlatforms')}</h2>
            </div>
            <ul className="divide-y divide-white/5">
              {COMING_SOON_PLATFORMS.map((platform) => (
                <li
                  key={platform.id}
                  className="flex items-center justify-between px-4 py-3.5 gap-3"
                >
                  <div>
                    <p className="text-sm text-zinc-300">{platform.name}</p>
                    <p className="text-[11px] text-zinc-600">{platform.hint}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-normal border-white/10 text-zinc-500">
                    {tc('soon')}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>

          <Button
            variant="ghost"
            onClick={() => logout()}
            disabled={isLoading}
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('logout')}
          </Button>

          <p className="text-center text-[11px] text-zinc-600">
            Quark Launcher v{getAppVersion()}
          </p>
        </div>
      </div>
    </div>
  );
}
