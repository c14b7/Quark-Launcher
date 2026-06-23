import { apiRequest, createSessionFromSecret, account } from './api-client';

export interface CardTheme {
  accentColor: string;
  gradientPreset?: string;
  glowEnabled?: boolean;
}

export interface UserProfile {
  $id: string;
  userId: string;
  email: string;
  name: string;
  displayName: string;
  friendCode: string;
  createdAt: string;
  steamLinked: boolean;
  steamId: string | null;
  preferences: string;
  bio: string;
  avatarFileId: string | null;
  bannerFileId: string | null;
  cardTheme: string;
  presence: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus: string;
  lastSeen: string | null;
  emailVerified: boolean;
  friendCodeRegeneratedAt: string | null;
}

export interface SteamIntegration {
  userId: string;
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
  linkedAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL: 'Nieprawidłowy adres email',
  WEAK_PASSWORD: 'Hasło musi mieć min. 8 znaków, literę i cyfrę',
  INVALID_NAME: 'Nieprawidłowa nazwa',
  EMAIL_TAKEN: 'Ten email jest już zajęty',
  RATE_LIMITED: 'Zbyt wiele prób. Spróbuj później',
  INVALID_CREDENTIALS: 'Nieprawidłowy email lub hasło',
  UNAUTHORIZED: 'Wymagane logowanie',
  INVALID_STEAM_ID: 'Nieprawidłowy profil Steam',
};

function mapError(code?: string, fallback?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback || 'Wystąpił błąd';
}

export const authService = {
  async register(email: string, password: string, name: string) {
    const result = await apiRequest<{ session: { userId: string; secret: string }; profile: UserProfile }>(
      '/auth/register',
      'POST',
      { email, password, name },
      false
    );

    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }

    const session = result.session as { userId: string; secret: string };
    await createSessionFromSecret(session.userId, session.secret);

    return { success: true, profile: result.profile as UserProfile };
  },

  async login(email: string, password: string) {
    const result = await apiRequest<{ session: { userId: string; secret: string }; profile: UserProfile }>(
      '/auth/login',
      'POST',
      { email, password },
      false
    );

    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }

    const session = result.session as { userId: string; secret: string };
    await createSessionFromSecret(session.userId, session.secret);

    return { success: true, profile: result.profile as UserProfile };
  },

  async logout() {
    try {
      await account.deleteSession('current');
      return { success: true };
    } catch {
      return { success: false, error: 'Logout failed' };
    }
  },

  async getCurrentUser() {
    try {
      const user = await account.get();
      return { success: true, user };
    } catch {
      return { success: false, user: null };
    }
  },

  async getMe() {
    const result = await apiRequest<{ profile: UserProfile; steamIntegration: SteamIntegration | null }>(
      '/auth/me',
      'GET'
    );
    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }
    return {
      success: true,
      profile: result.profile as UserProfile,
      steamIntegration: (result.steamIntegration as SteamIntegration) || null,
    };
  },

  async updateProfile(data: Partial<{
    displayName: string;
    bio: string;
    cardTheme: string | CardTheme;
    customStatus: string;
    presence: string;
  }>) {
    const payload: Record<string, unknown> = { ...data };
    if (data.cardTheme && typeof data.cardTheme !== 'string') {
      payload.cardTheme = JSON.stringify(data.cardTheme);
    }

    const result = await apiRequest<{ profile: UserProfile }>('/auth/profile', 'PATCH', payload);
    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }
    return { success: true, profile: result.profile as UserProfile };
  },

  async updatePassword(newPassword: string, oldPassword: string) {
    const result = await apiRequest('/auth/password', 'POST', { newPassword, oldPassword });
    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }
    return { success: true };
  },

  async updateName(name: string) {
    try {
      await account.updateName(name);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return { success: false, error: err.message || 'Failed to update name' };
    }
  },

  async regenerateFriendCode() {
    const result = await apiRequest<{ friendCode: string }>('/auth/friend-code/regenerate', 'POST');
    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }
    return { success: true, friendCode: result.friendCode as string };
  },

  async linkSteam(steamId?: string, vanityUrl?: string) {
    const result = await apiRequest<{ steamIntegration: SteamIntegration }>(
      '/auth/steam/link',
      'POST',
      { steamId, vanityUrl }
    );
    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }
    return { success: true, integration: result.steamIntegration as SteamIntegration };
  },

  async unlinkSteam() {
    const result = await apiRequest('/auth/steam/unlink', 'POST');
    if (!result.success) {
      return { success: false, error: mapError(result.code, result.error) };
    }
    return { success: true };
  },
};

export function parseCardTheme(raw: string | undefined): CardTheme {
  try {
    return JSON.parse(raw || '{}') as CardTheme;
  } catch {
    return { accentColor: '#8b5cf6', gradientPreset: 'violet-fuchsia', glowEnabled: true };
  }
}
