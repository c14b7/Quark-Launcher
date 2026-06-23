'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';

/** Syncs backend Steam integration into local settings for legacy components. */
export function SteamSync() {
  const { steamIntegration } = useAuth();
  const { setSteamUser } = useSettings();

  useEffect(() => {
    if (steamIntegration?.steamId) {
      setSteamUser({
        steamId: steamIntegration.steamId,
        personaName: steamIntegration.personaName,
        avatarUrl: steamIntegration.avatarUrl,
        avatarMediumUrl: steamIntegration.avatarUrl,
        avatarFullUrl: steamIntegration.avatarUrl,
        profileUrl: steamIntegration.profileUrl,
        isOnline: true,
      });
    }
  }, [steamIntegration, setSteamUser]);

  return null;
}
