export interface ProfileShowcasePrefs {
  favoriteGameId?: string;
  favoriteGameName?: string;
  favoriteGameImage?: string;
  motto?: string;
  showPlayStats?: boolean;
}

export interface ProfileDisplayPrefs {
  pronouns?: string;
  location?: string;
  showMemberSince?: boolean;
  steamPromptSkipped?: boolean;
  /** friends | private — synced via /stats */
  statsVisibility?: 'friends' | 'private';
  showcase?: ProfileShowcasePrefs;
}

export function parseProfilePreferences(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseShowcase(raw: unknown): ProfileShowcasePrefs {
  if (!raw || typeof raw !== 'object') return { showPlayStats: true };
  const s = raw as Record<string, unknown>;
  return {
    favoriteGameId: typeof s.favoriteGameId === 'string' ? s.favoriteGameId : undefined,
    favoriteGameName: typeof s.favoriteGameName === 'string' ? s.favoriteGameName : undefined,
    favoriteGameImage: typeof s.favoriteGameImage === 'string' ? s.favoriteGameImage : undefined,
    motto: typeof s.motto === 'string' ? s.motto : undefined,
    showPlayStats: s.showPlayStats !== false,
  };
}

export function getProfileDisplayPrefs(raw?: string | null): ProfileDisplayPrefs {
  const p = parseProfilePreferences(raw);
  return {
    pronouns: typeof p.pronouns === 'string' ? p.pronouns : '',
    location: typeof p.location === 'string' ? p.location : '',
    showMemberSince: p.showMemberSince !== false,
    steamPromptSkipped: p.steamPromptSkipped === true,
    statsVisibility: p.statsVisibility === 'private' ? 'private' : 'friends',
    showcase: parseShowcase(p.showcase),
  };
}

export function mergeProfilePreferences(
  raw: string | null | undefined,
  patch: Record<string, unknown>
): string {
  const base = parseProfilePreferences(raw);
  const next = { ...base, ...patch };
  if (patch.showcase && typeof patch.showcase === 'object') {
    next.showcase = {
      ...parseShowcase(base.showcase),
      ...(patch.showcase as Record<string, unknown>),
    };
  }
  return JSON.stringify(next);
}

export function isSteamPromptSkipped(preferences?: string | null): boolean {
  return getProfileDisplayPrefs(preferences).steamPromptSkipped === true;
}
