'use client';

import {
  Pencil,
  LogOut,
  Mail,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { SteamIntegrationPanel } from '@/components/steam-integration-panel';
import { FriendCodeDisplay } from '@/components/user/friend-code-display';
import { UserCard } from '@/components/user/user-card';
import { getAvatarUrl } from '@/lib/avatar-service';
import { getAppVersion } from '@/lib/build-env';
import { isPremiumUser } from '@/lib/subscription';
import { useTranslations } from 'next-intl';

interface AccountsViewProps {
  onOpenProfileEdit?: () => void;
}

const COMING_SOON_PLATFORMS = [
  { id: 'epic', name: 'Epic Games' },
  { id: 'xbox', name: 'Xbox' },
  { id: 'gog', name: 'GOG Galaxy' },
];

export function AccountsView({ onOpenProfileEdit }: AccountsViewProps) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const { user, profile, subscription, logout, isLoading, regenerateFriendCode } = useAuth();

  const email = profile?.email || user?.email || '';
  const premium = isPremiumUser(subscription);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 px-6 py-5 border-b border-border/60">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="content-shell max-w-3xl mx-auto px-6 py-6 space-y-6 pb-12">
          {profile && !profile.emailVerified && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <Mail className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{t('emailVerifyHint')}</p>
            </div>
          )}

          {/* Profile */}
          <section className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-foreground">{t('profileSection')}</h2>
              <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                {premium ? t('planPremium') : t('planFree')}
              </Badge>
            </div>

            <div className="p-4 space-y-4">
              {profile ? (
                <>
                  <UserCard profile={profile} compact avatarUrl={getAvatarUrl(profile.avatarFileId)} />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{email}</span>
                  </div>
                  {profile.friendCode && (
                    <FriendCodeDisplay
                      code={profile.friendCode}
                      glowEnabled={false}
                      onRegenerate={async () => { await regenerateFriendCode(); }}
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto gap-2"
                    onClick={() => onOpenProfileEdit?.()}
                  >
                    <Pencil className="h-4 w-4" />
                    {t('editProfile')}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('profileLoading')}</p>
              )}
            </div>
          </section>

          {/* Steam */}
          <section className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">{t('integrationsSection')}</h2>
            </div>
            <div className="p-4">
              <SteamIntegrationPanel compact />
            </div>
          </section>

          {/* Coming soon */}
          <section className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40">
              <h2 className="text-sm font-medium text-muted-foreground">{t('morePlatforms')}</h2>
            </div>
            <ul className="divide-y divide-border/40">
              {COMING_SOON_PLATFORMS.map((platform) => (
                <li
                  key={platform.id}
                  className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground"
                >
                  <span>{platform.name}</span>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {tc('soon')}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          <Button
            variant="ghost"
            onClick={() => logout()}
            disabled={isLoading}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('logout')}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground/70">
            Quark Launcher v{getAppVersion()}
          </p>
        </div>
      </div>
    </div>
  );
}
