import { apiRequest } from '@/lib/api-client';
import { friendsService } from '@/lib/friends-service';
import { getProfileDisplayPrefs } from '@/lib/profile-preferences';
import { getMediaSession } from '@/lib/media-session';

type SpotifyStatusPayload = {
  configured?: boolean;
  linked?: boolean;
  displayName?: string | null;
  hint?: string;
};

type SpotifyAuthUrlPayload = {
  url?: string;
  verifier?: string;
  state?: string;
  redirectUri?: string;
};

export async function getSpotifyStatus() {
  const r = await apiRequest<SpotifyStatusPayload>('/spotify/me', 'GET');
  return {
    ...r,
    configured: typeof r.configured === 'boolean' ? r.configured : undefined,
    linked: typeof r.linked === 'boolean' ? r.linked : undefined,
    displayName: typeof r.displayName === 'string' ? r.displayName : null,
    hint: typeof r.hint === 'string' ? r.hint : undefined,
  };
}

export async function getSpotifyAuthUrl() {
  const r = await apiRequest<SpotifyAuthUrlPayload>('/spotify/auth-url', 'GET');
  return {
    ...r,
    url: typeof r.url === 'string' ? r.url : undefined,
    verifier: typeof r.verifier === 'string' ? r.verifier : undefined,
    state: typeof r.state === 'string' ? r.state : undefined,
    redirectUri: typeof r.redirectUri === 'string' ? r.redirectUri : undefined,
  };
}

export async function completeSpotifyCallback(code: string, verifier: string) {
  return apiRequest('/spotify/callback', 'POST', { code, verifier });
}

export async function unlinkSpotify() {
  return apiRequest('/spotify/unlink', 'DELETE');
}

export async function fetchSpotifyCurrentlyPlaying() {
  return apiRequest<{
    playing?: boolean;
    linked?: boolean;
    title?: string | null;
    artist?: string | null;
    artUrl?: string | null;
    source?: string;
  }>('/spotify/currently-playing', 'GET');
}

/** Sync listening fields only — does not change presence status (DND/idle safe). */
export async function syncListeningPresence(preferences?: string | null) {
  const prefs = getProfileDisplayPrefs(preferences);
  if (prefs.shareListening === 'private') {
    await friendsService.updatePresence(undefined, undefined, { clearListening: true });
    return { shared: false };
  }

  // Prefer Spotify when linked; ignore NOT_FOUND / not-configured quietly (fallback SMTC).
  const sp = await fetchSpotifyCurrentlyPlaying();
  if (sp.success && sp.playing && sp.title) {
    await friendsService.updatePresence(undefined, undefined, {
      listeningTitle: sp.title,
      listeningArtist: sp.artist || '',
      listeningArtUrl: sp.artUrl || '',
      listeningSource: 'spotify',
    });
    return { shared: true, source: 'spotify' as const };
  }

  const smtc = getMediaSession();
  if (smtc?.title && smtc.isPlaying) {
    await friendsService.updatePresence(undefined, undefined, {
      listeningTitle: smtc.title,
      listeningArtist: smtc.artist || '',
      listeningArtUrl: smtc.artworkUrl || '',
      listeningSource: 'smtc',
    });
    return { shared: true, source: 'smtc' as const };
  }

  await friendsService.updatePresence(undefined, undefined, { clearListening: true });
  return { shared: false };
}
