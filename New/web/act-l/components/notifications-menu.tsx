'use client';

import { Bell, Check, UserPlus, UserCheck, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { useFriends } from '@/lib/friends-context';
import { cn } from '@/lib/utils';

export function NotificationsMenu() {
  const t = useTranslations('notifications');
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    incomingRequests,
  } = useFriends();

  const getMessage = (type: string, name: string, gameName?: string) => {
    if (type === 'friend_request') return t('friendRequest', { name });
    if (type === 'friend_accepted') return t('friendAccepted', { name });
    if (type === 'friend_playing') return t('friendPlaying', { name, game: gameName || 'grę' });
    return name;
  };

  const hasContent = notifications.length > 0 || incomingRequests.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg hover:bg-white/5">
          <Bell className="h-4 w-4 text-zinc-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 bg-zinc-900/95 border-white/10 rounded-xl">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">{t('title')}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="text-[11px] text-violet-400 hover:text-violet-300 px-2"
            >
              {t('markAllRead')}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />

        {!hasContent ? (
          <DropdownMenuItem disabled className="text-zinc-500 text-xs">
            {t('empty')}
          </DropdownMenuItem>
        ) : (
          <>
            {incomingRequests.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  {t('pendingRequests')}
                </div>
                {incomingRequests.map((req) => (
                  <DropdownMenuItem
                    key={req.id}
                    className="flex items-start gap-2.5 py-2.5 cursor-default focus:bg-white/5"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <UserPlus className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-200 leading-snug">
                        {t('friendRequest', { name: req.profile?.displayName || t('someone') })}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t('openFriendsHint')}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
                {notifications.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
              </>
            )}

            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={cn(
                  'flex items-start gap-2.5 py-2.5 cursor-pointer',
                  !notif.read && 'bg-violet-500/5'
                )}
                onClick={() => markNotificationRead(notif.id)}
              >
                {notif.type === 'friend_request' ? (
                  <UserPlus className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                ) : notif.type === 'friend_playing' ? (
                  <Gamepad2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <UserCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 leading-snug">
                    {getMessage(notif.type, notif.displayName, notif.gameName)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0 mt-1.5" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {notifications.some((n) => n.read) && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="gap-2 text-xs text-zinc-500 justify-center"
              onClick={markAllNotificationsRead}
            >
              <Check className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
