'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, UserProfile, SteamIntegration, CardTheme, parseCardTheme } from './auth-service';
import { parseSubscription, type UserSubscription } from './subscription';
import { apiRequest } from './api-client';
import { Models } from 'appwrite';
import { track, endSession, flushTelemetry } from './telemetry/client';

const PROFILE_CACHE_KEY = 'quark_profile_cache';

interface ProfileCache {
  profile: UserProfile;
  steamIntegration: SteamIntegration | null;
}

async function saveProfileCache(data: ProfileCache) {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveUserData('quarkProfileCache', data);
    } else {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    /* ignore */
  }
}

async function loadProfileCache(): Promise<ProfileCache | null> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.loadUserData('quarkProfileCache');
      if (result.success && result.data) return result.data as ProfileCache;
    } else {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) return JSON.parse(raw) as ProfileCache;
    }
  } catch {
    /* ignore */
  }
  return null;
}

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
  subscription: UserSubscription;
  steamIntegration: SteamIntegration | null;
  cardTheme: CardTheme;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  meLoaded: boolean;
  apiUnavailable: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  updateProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  applyProfile: (profile: UserProfile) => void;
  updatePassword: (newPassword: string, oldPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateName: (name: string) => Promise<{ success: boolean; error?: string }>;
  regenerateFriendCode: () => Promise<{ success: boolean; friendCode?: string; error?: string }>;

  linkSteam: (steamId?: string, vanityUrl?: string) => Promise<{ success: boolean; error?: string }>;
  unlinkSteam: () => Promise<{ success: boolean; error?: string }>;

  completeOnboarding: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ONBOARDING_KEY = 'quark_onboarding_complete';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [steamIntegration, setSteamIntegration] = useState<SteamIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [meLoaded, setMeLoaded] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnboardingComplete(localStorage.getItem(ONBOARDING_KEY) === 'true');
    }
  }, []);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setMeLoaded(false);
    setApiUnavailable(false);
    try {
      const userResult = await authService.getCurrentUser();
      if (userResult.success && userResult.user) {
        setUser(userResult.user);
        const meResult = await authService.getMe();
        if (meResult.success && meResult.profile) {
          setProfile(meResult.profile);
          setSteamIntegration(meResult.steamIntegration || null);
          setMeLoaded(true);
          await saveProfileCache({
            profile: meResult.profile,
            steamIntegration: meResult.steamIntegration || null,
          });
        } else if (meResult.code === 'FUNCTION_ERROR' || meResult.code === 'NETWORK_ERROR') {
          setApiUnavailable(true);
          const cached = await loadProfileCache();
          if (cached?.profile) {
            setProfile(cached.profile);
            setSteamIntegration(cached.steamIntegration);
            setMeLoaded(true);
          }
        } else if (meResult.code === 'PROFILE_NOT_FOUND' || meResult.code === 'API_ERROR') {
          const init = await apiRequest<{ profile: UserProfile }>(
            '/auth/profile/init',
            'POST',
            { name: userResult.user.name },
            true
          );
          if (init.success && init.profile) {
            setProfile(init.profile as UserProfile);
            setMeLoaded(true);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setSteamIntegration(null);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      setApiUnavailable(true);
      const cached = await loadProfileCache();
      if (cached?.profile) {
        setProfile(cached.profile);
        setSteamIntegration(cached.steamIntegration);
        setMeLoaded(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        await loadUser();
        if (typeof window !== 'undefined') {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setIsOnboardingComplete(true);
        }
        track('auth.login', { method: 'email' }, 'auth');
        return { success: true };
      }
      setError(result.error || 'Login failed');
      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await authService.register(email, password, name);
      if (result.success) {
        if (result.profile) setProfile(result.profile);
        await loadUser();
        if (typeof window !== 'undefined') {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setIsOnboardingComplete(true);
        }
        track('auth.register', {}, 'auth');
        return { success: true };
      }
      setError(result.error || 'Registration failed');
      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      track('auth.logout', {}, 'auth');
      endSession('logout');
      await flushTelemetry();
      await authService.logout();
      setUser(null);
      setProfile(null);
      setSteamIntegration(null);
      setMeLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Record<string, unknown>) => {
    const result = await authService.updateProfile(data as Parameters<typeof authService.updateProfile>[0]);
    if (result.success && result.profile) {
      setProfile(result.profile);
      await saveProfileCache({
        profile: result.profile,
        steamIntegration: steamIntegration,
      });
    }
    return result;
  };

  const applyProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    void saveProfileCache({
      profile: nextProfile,
      steamIntegration,
    });
  };

  const regenerateFriendCode = async () => {
    const result = await authService.regenerateFriendCode();
    if (result.success) await loadUser();
    return result;
  };

  const linkSteam = async (steamId?: string, vanityUrl?: string) => {
    const result = await authService.linkSteam(steamId, vanityUrl);
    if (result.success) {
      if ('integration' in result && result.integration) {
        setSteamIntegration(result.integration);
      }
      if ('profile' in result && result.profile) {
        setProfile(result.profile);
      }
      track('steam.linked', {}, 'social');
      await loadUser();
    }
    return result;
  };

  const unlinkSteam = async () => {
    const result = await authService.unlinkSteam();
    if (result.success) {
      setSteamIntegration(null);
      track('steam.unlinked', {}, 'social');
      await loadUser();
    }
    return result;
  };

  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
      track('auth.onboarding_complete', {}, 'auth');
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    subscription: parseSubscription(profile),
    steamIntegration,
    cardTheme: parseCardTheme(profile?.cardTheme),
    isLoading,
    isAuthenticated: !!user,
    isOnboardingComplete,
    meLoaded,
    apiUnavailable,
    error,
    login,
    register,
    logout,
    updateProfile,
    applyProfile,
    updatePassword: authService.updatePassword,
    updateName: async (name) => {
      const result = await authService.updateName(name);
      if (result.success) await loadUser();
      return result;
    },
    regenerateFriendCode,
    linkSteam,
    unlinkSteam,
    completeOnboarding,
    refreshUser: loadUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
