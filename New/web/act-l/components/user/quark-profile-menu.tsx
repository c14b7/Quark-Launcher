'use client';

import { useAuth } from '@/lib/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Settings, LogOut, Link2, ChevronDown, Pencil, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface QuarkProfileMenuProps {
  onNavigate?: (view: string) => void;
  onOpenSettings?: () => void;
  onOpenSteamIntegration?: () => void;
  onOpenProfileEdit?: () => void;
}

const PRESENCE_OPTIONS = ['online', 'idle', 'dnd', 'offline'] as const;

function presenceColor(presence?: string) {
  switch (presence) {
    case 'online':
      return 'bg-green-500';
    case 'idle':
      return 'bg-yellow-500';
    case 'dnd':
      return 'bg-red-500';
    default:
      return 'bg-zinc-500';
  }
}

export function QuarkProfileMenu({
  onNavigate,
  onOpenSettings,
  onOpenSteamIntegration,
  onOpenProfileEdit,
}: QuarkProfileMenuProps) {
  const t = useTranslations('profile');
  const { profile, steamIntegration, logout, updateProfile } = useAuth();

  const displayName = profile?.displayName || profile?.name || t('guest');
  const initials = displayName.slice(0, 2).toUpperCase();
  const steamLinked = profile?.steamLinked || !!steamIntegration?.steamId;

  const setPresence = async (presence: string) => {
    await updateProfile({ presence });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-lg hover:bg-white/5 transition-colors outline-none"
        >
          <div className="relative">
            <Avatar className="h-7 w-7 border border-white/10">
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950',
                presenceColor(profile?.presence)
              )}
            />
          </div>
          <span className="text-xs font-medium text-zinc-300 max-w-[100px] truncate hidden lg:inline">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 hidden lg:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 backdrop-blur-xl border-white/10 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-white">{displayName}</span>
            {profile?.customStatus && (
              <span className="text-xs text-zinc-500 truncate">{profile.customStatus}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg"
          onClick={() => onOpenProfileEdit?.()}
        >
          <Pencil className="h-4 w-4" />
          {t('editProfile')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg"
          onClick={() => onNavigate?.('accounts')}
        >
          <User className="h-4 w-4" />
          {t('myAccount')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          {t('settings')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 cursor-pointer rounded-lg">
            <Circle className="h-4 w-4" />
            {t('presence')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-zinc-900/95 border-white/10 rounded-xl">
            {PRESENCE_OPTIONS.map((p) => (
              <DropdownMenuItem
                key={p}
                className="gap-2 cursor-pointer rounded-lg"
                onClick={() => setPresence(p)}
              >
                <span className={cn('w-2 h-2 rounded-full', presenceColor(p))} />
                {t(`presence_${p}`)}
                {profile?.presence === p && <span className="ml-auto text-violet-400 text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">
          {t('integrations')}
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg"
          onClick={onOpenSteamIntegration}
        >
          <Link2 className="h-4 w-4" />
          {steamLinked ? t('steamConnected') : t('connectSteam')}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg text-red-400 focus:text-red-400"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
