export interface ProfileDisplayPrefs {
  pronouns?: string;
  location?: string;
  showMemberSince?: boolean;
  steamPromptSkipped?: boolean;
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

export function getProfileDisplayPrefs(raw?: string | null): ProfileDisplayPrefs {
  const p = parseProfilePreferences(raw);
  return {
    pronouns: typeof p.pronouns === 'string' ? p.pronouns : '',
    location: typeof p.location === 'string' ? p.location : '',
    showMemberSince: p.showMemberSince !== false,
    steamPromptSkipped: p.steamPromptSkipped === true,
  };
}

export function mergeProfilePreferences(
  raw: string | null | undefined,
  patch: Record<string, unknown>
): string {
  return JSON.stringify({ ...parseProfilePreferences(raw), ...patch });
}

export function isSteamPromptSkipped(preferences?: string | null): boolean {
  return getProfileDisplayPrefs(preferences).steamPromptSkipped === true;
}
