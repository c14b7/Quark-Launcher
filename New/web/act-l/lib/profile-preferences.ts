export function parseProfilePreferences(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function mergeProfilePreferences(
  raw: string | null | undefined,
  patch: Record<string, unknown>
): string {
  return JSON.stringify({ ...parseProfilePreferences(raw), ...patch });
}

export function isSteamPromptSkipped(preferences?: string | null): boolean {
  return parseProfilePreferences(preferences).steamPromptSkipped === true;
}
