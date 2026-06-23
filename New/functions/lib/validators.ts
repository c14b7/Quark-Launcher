const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_RE = /^[\p{L}\p{N}_\-. ]{2,32}$/u;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const FRIEND_CODE_RE = /^\d{6}$/;

const ALLOWED_GRADIENTS = new Set([
  'violet-fuchsia',
  'blue-cyan',
  'emerald',
  'orange-red',
  'zinc',
]);

export function validateEmail(email: string): string | null {
  if (!email || email.length > 254) return 'INVALID_EMAIL';
  if (!EMAIL_RE.test(email)) return 'INVALID_EMAIL';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'WEAK_PASSWORD';
  if (password.length > 256) return 'WEAK_PASSWORD';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'WEAK_PASSWORD';
  return null;
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length < 2) return 'INVALID_NAME';
  if (name.length > 100) return 'INVALID_NAME';
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  if (!DISPLAY_NAME_RE.test(displayName)) return 'INVALID_DISPLAY_NAME';
  return null;
}

export function validateBio(bio: string): string | null {
  if (bio.length > 190) return 'INVALID_BIO';
  if (/<[^>]+>/.test(bio)) return 'INVALID_BIO';
  return null;
}

export function validateFriendCode(code: string): string | null {
  const normalized = code.replace(/\s/g, '');
  if (!FRIEND_CODE_RE.test(normalized)) return 'INVALID_FRIEND_CODE';
  return null;
}

export function normalizeFriendCode(code: string): string {
  return code.replace(/\s/g, '');
}

export function validateCardTheme(raw: string): { valid: boolean; parsed?: Record<string, unknown>; error?: string } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.accentColor && typeof parsed.accentColor === 'string' && !HEX_COLOR_RE.test(parsed.accentColor)) {
      return { valid: false, error: 'INVALID_CARD_THEME' };
    }
    if (parsed.gradientPreset && typeof parsed.gradientPreset === 'string' && !ALLOWED_GRADIENTS.has(parsed.gradientPreset)) {
      return { valid: false, error: 'INVALID_CARD_THEME' };
    }
    if (parsed.glowEnabled !== undefined && typeof parsed.glowEnabled !== 'boolean') {
      return { valid: false, error: 'INVALID_CARD_THEME' };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false, error: 'INVALID_CARD_THEME' };
  }
}

export function validatePresence(presence: string): string | null {
  if (!['online', 'idle', 'dnd', 'offline'].includes(presence)) return 'INVALID_PRESENCE';
  return null;
}

export function validateCustomStatus(status: string): string | null {
  if (status.length > 128) return 'INVALID_CUSTOM_STATUS';
  return null;
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}
