'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { parseFriendCardTheme, GRADIENT_PRESETS } from '@/lib/friends-service';
import type { QuarkFriend } from '@/lib/types';
import type { UserProfile } from '@/lib/auth-service';
import { parseCardTheme } from '@/lib/auth-service';
import { getAvatarUrl, getBannerUrl } from '@/lib/avatar-service';
import { getProfileDisplayPrefs } from '@/lib/profile-preferences';
import { MapPin, Gamepad2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

type ProfileData = QuarkFriend | UserProfile | {
  displayName?: string;
  name?: string;
  bio?: string;
  presence?: string;
  customStatus?: string;
  pronouns?: string;
  location?: string;
  preferences?: string;
  cardTheme?: string;
  createdAt?: string;
  avatarFileId?: string | null;
  bannerFileId?: string | null;
};

interface UserCardProps {
  profile: ProfileData;
  className?: string;
  compact?: boolean;
  showBio?: boolean;
  avatarUrl?: string;
  bannerUrl?: string;
  showMemberSince?: boolean;
  launchCount?: number;
  steamHours?: number;
}

function getDisplayName(profile: ProfileData): string {
  return profile.displayName || (profile as UserProfile).name || 'Użytkownik';
}

function getPresenceColor(presence?: string): string {
  switch (presence) {
    case 'online': return 'bg-emerald-500';
    case 'idle': return 'bg-amber-500';
    case 'dnd': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

function resolveExtras(profile: ProfileData, showMemberSince?: boolean) {
  const fromProfile = profile as QuarkFriend & UserProfile;
  const prefs = getProfileDisplayPrefs(fromProfile.preferences);
  return {
    pronouns: fromProfile.pronouns || prefs.pronouns || '',
    location: fromProfile.location || prefs.location || '',
    showMemberSince: showMemberSince ?? prefs.showMemberSince !== false,
    showcase: prefs.showcase,
  };
}

export function UserCard({
  profile,
  className,
  compact = false,
  showBio = true,
  avatarUrl,
  bannerUrl,
  showMemberSince,
  launchCount,
  steamHours,
}: UserCardProps) {
  const locale = useLocale();
  const ta = useTranslations('account');
  const theme = profile.cardTheme
    ? parseFriendCardTheme(profile.cardTheme)
    : parseCardTheme(undefined);
  const gradient = GRADIENT_PRESETS[theme.gradientPreset || 'violet-fuchsia'] || GRADIENT_PRESETS['violet-fuchsia'];
  const name = getDisplayName(profile);
  const initials = name.slice(0, 2).toUpperCase();
  const imageSrc = avatarUrl ?? getAvatarUrl(profile.avatarFileId);
  const extras = resolveExtras(profile, showMemberSince);
  const borderStyle = theme.borderStyle || 'default';
  const resolvedBanner =
    bannerUrl ||
    getBannerUrl(profile.bannerFileId) ||
    extras.showcase?.favoriteGameImage;

  const borderClass =
    borderStyle === 'minimal'
      ? 'border-zinc-800/60'
      : borderStyle === 'accent'
        ? 'border-2'
        : 'border border-zinc-800/80';

  const showStats = extras.showcase?.showPlayStats !== false && (launchCount != null || steamHours != null);

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm',
        borderClass,
        theme.glowEnabled && 'shadow-md',
        className
      )}
      style={{
        borderColor: borderStyle === 'accent' ? `${theme.accentColor}66` : undefined,
        boxShadow: theme.glowEnabled ? `0 8px 32px ${theme.accentColor}18` : undefined,
      }}
    >
      <div
        className={cn('relative bg-gradient-to-r', gradient, compact ? 'h-14' : 'h-20')}
        style={
          resolvedBanner
            ? {
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.55), transparent), url(${resolvedBanner})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />
      <div className={cn('px-4', compact ? 'pb-3' : 'pb-4')}>
        <div className={cn('flex items-end gap-3', compact ? '-mt-5' : '-mt-7')}>
          <Avatar
            className={cn('border-[3px] border-card bg-card', compact ? 'h-11 w-11' : 'h-14 w-14')}
            style={{ boxShadow: `0 0 0 1px ${theme.accentColor}33` }}
          >
            <AvatarImage src={imageSrc} alt={name} />
            <AvatarFallback
              className="text-white font-semibold text-sm"
              style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}99)` }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className={cn('font-semibold text-foreground truncate', compact ? 'text-sm' : 'text-base')}>
                {name}
              </h3>
              <span className={cn('h-2 w-2 rounded-full shrink-0', getPresenceColor(profile.presence))} />
            </div>
            {extras.pronouns && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{extras.pronouns}</p>
            )}
            {extras.showcase?.motto && (
              <p className="text-xs text-foreground/80 italic truncate mt-0.5">„{extras.showcase.motto}”</p>
            )}
            {profile.customStatus && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.customStatus}</p>
            )}
          </div>
        </div>

        {extras.showcase?.favoriteGameName && !compact && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
            {extras.showcase.favoriteGameImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={extras.showcase.favoriteGameImage}
                alt=""
                className="h-8 w-6 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Gamepad2 className="h-3 w-3" /> {ta('favoriteGame')}
              </p>
              <p className="text-xs text-foreground truncate">{extras.showcase.favoriteGameName}</p>
            </div>
          </div>
        )}

        {showStats && !compact && (
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            {launchCount != null && <span>{ta('launchesCount', { count: launchCount })}</span>}
            {steamHours != null && steamHours > 0 && (
              <span>{ta('steamHoursShort', { hours: steamHours })}</span>
            )}
          </div>
        )}

        {extras.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2.5 truncate">
            <MapPin className="h-3 w-3 shrink-0 opacity-70" />
            {extras.location}
          </p>
        )}

        {showBio && profile.bio && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">{profile.bio}</p>
        )}

        {profile.createdAt && extras.showMemberSince && !compact && (
          <p className="text-[11px] text-muted-foreground/70 mt-3 pt-3 border-t border-border/60">
            {new Date(profile.createdAt).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
