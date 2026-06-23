'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, UserProfile, SteamIntegration, CardTheme, parseCardTheme } from './auth-service';
import { Models } from 'appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
  steamIntegration: SteamIntegration | null;
  cardTheme: CardTheme;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  updateProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
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
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnboardingComplete(localStorage.getItem(ONBOARDING_KEY) === 'true');
    }
  }, []);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const userResult = await authService.getCurrentUser();
      if (userResult.success && userResult.user) {
        setUser(userResult.user);
        const meResult = await authService.getMe();
        if (meResult.success && meResult.profile) {
          setProfile(meResult.profile);
          setSteamIntegration(meResult.steamIntegration || null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setSteamIntegration(null);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
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
        await loadUser();
        if (typeof window !== 'undefined') {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setIsOnboardingComplete(true);
        }
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
      await authService.logout();
      setUser(null);
      setProfile(null);
      setSteamIntegration(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Record<string, unknown>) => {
    const result = await authService.updateProfile(data as Parameters<typeof authService.updateProfile>[0]);
    if (result.success && result.profile) {
      setProfile(result.profile);
    }
    return result;
  };

  const regenerateFriendCode = async () => {
    const result = await authService.regenerateFriendCode();
    if (result.success) await loadUser();
    return result;
  };

  const linkSteam = async (steamId?: string, vanityUrl?: string) => {
    const result = await authService.linkSteam(steamId, vanityUrl);
    if (result.success) await loadUser();
    return result;
  };

  const unlinkSteam = async () => {
    const result = await authService.unlinkSteam();
    if (result.success) {
      setSteamIntegration(null);
      await loadUser();
    }
    return result;
  };

  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    steamIntegration,
    cardTheme: parseCardTheme(profile?.cardTheme),
    isLoading,
    isAuthenticated: !!user,
    isOnboardingComplete,
    error,
    login,
    register,
    logout,
    updateProfile,
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
