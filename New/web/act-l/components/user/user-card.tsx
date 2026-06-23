'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { parseFriendCardTheme, GRADIENT_PRESETS } from '@/lib/friends-service';
import type { QuarkFriend } from '@/lib/types';
import type { UserProfile } from '@/lib/auth-service';
import { parseCardTheme } from '@/lib/auth-service';
import { getAvatarUrl } from '@/lib/avatar-service';

type ProfileData = QuarkFriend | UserProfile | {
  displayName?: string;
  name?: string;
  bio?: string;
  presence?: string;
  customStatus?: string;
  cardTheme?: string;
  createdAt?: string;
  avatarFileId?: string | null;
};

interface UserCardProps {
  profile: ProfileData;
  className?: string;
  compact?: boolean;
  showBio?: boolean;
  avatarUrl?: string;
}

function getDisplayName(profile: ProfileData): string {
  return profile.displayName || (profile as UserProfile).name || 'Użytkownik';
}

function getPresenceColor(presence?: string): string {
  switch (presence) {
    case 'online': return 'bg-green-500';
    case 'idle': return 'bg-yellow-500';
    case 'dnd': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
}

export function UserCard({ profile, className, compact = false, showBio = true, avatarUrl }: UserCardProps) {
  const theme = profile.cardTheme
    ? parseFriendCardTheme(profile.cardTheme)
    : parseCardTheme(undefined);
  const gradient = GRADIENT_PRESETS[theme.gradientPreset || 'violet-fuchsia'] || GRADIENT_PRESETS['violet-fuchsia'];
  const name = getDisplayName(profile);
  const initials = name.slice(0, 2).toUpperCase();
  const imageSrc = avatarUrl ?? getAvatarUrl(profile.avatarFileId);

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/60',
        theme.glowEnabled && 'shadow-lg shadow-violet-500/10',
        className
      )}
      style={theme.glowEnabled ? { boxShadow: `0 0 24px ${theme.accentColor}22` } : undefined}
    >
      <div className={cn('bg-gradient-to-r', gradient, compact ? 'h-16' : 'h-24')} />
      <div className={cn('px-4', compact ? 'pb-3' : 'pb-4')}>
        <div className={cn('flex items-end gap-3', compact ? '-mt-6' : '-mt-8')}>
          <Avatar
            className={cn('border-4 border-zinc-900', compact ? 'h-12 w-12' : 'h-16 w-16')}
            style={{ borderColor: theme.accentColor + '55' }}
          >
            <AvatarImage src={imageSrc} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2">
              <h3 className={cn('font-bold text-white truncate', compact ? 'text-sm' : 'text-base')}>{name}</h3>
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', getPresenceColor(profile.presence))} />
            </div>
            {profile.customStatus && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">{profile.customStatus}</p>
            )}
          </div>
        </div>
        {showBio && profile.bio && (
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{profile.bio}</p>
        )}
        {profile.createdAt && !compact && (
          <p className="text-xs text-zinc-600 mt-2">
            Członek od {new Date(profile.createdAt).toLocaleDateString('pl-PL')}
          </p>
        )}
      </div>
    </div>
  );
}
