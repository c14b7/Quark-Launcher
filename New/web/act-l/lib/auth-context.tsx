'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, steamService, UserProfile, SteamIntegration, SteamLinkData } from './appwrite';
import { Models } from 'appwrite';

// Auth Context Types
interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
  steamIntegration: SteamIntegration | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  error: string | null;
  
  // Auth actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  // Profile actions
  updateProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string, oldPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateName: (name: string) => Promise<{ success: boolean; error?: string }>;
  
  // Steam actions
  linkSteam: (steamId: string, steamData: SteamLinkData) => Promise<{ success: boolean; error?: string }>;
  unlinkSteam: () => Promise<{ success: boolean; error?: string }>;
  
  // Onboarding
  completeOnboarding: () => void;
  
  // Utils
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const ONBOARDING_KEY = 'quark_onboarding_complete';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [steamIntegration, setSteamIntegration] = useState<SteamIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Check onboarding status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboardingStatus = localStorage.getItem(ONBOARDING_KEY);
      setIsOnboardingComplete(onboardingStatus === 'true');
    }
  }, []);

  // Load user on mount
  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authService.getCurrentUser();
      if (result.success && result.user) {
        setUser(result.user);
        
        // Load profile
        const profileResult = await authService.getUserProfile(result.user.$id);
        if (profileResult.success && profileResult.profile) {
          setProfile(profileResult.profile as unknown as UserProfile);
        } else {
          // Profile doesn't exist, create it
          console.log('Profile not found, creating...');
          const createResult = await authService.createUserProfile(
            result.user.$id,
            result.user.email,
            result.user.name
          );
          if (createResult.success) {
            // Reload profile after creation
            const newProfileResult = await authService.getUserProfile(result.user.$id);
            if (newProfileResult.success && newProfileResult.profile) {
              setProfile(newProfileResult.profile as unknown as UserProfile);
            }
          }
        }
        
        // Load Steam integration
        const steamResult = await steamService.getSteamIntegration(result.user.$id);
        if (steamResult.success && steamResult.integration) {
          setSteamIntegration(steamResult.integration as unknown as SteamIntegration);
        }
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

  // Login
  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        await loadUser();
        // Automatycznie oznacz onboarding jako ukończony po zalogowaniu
        if (typeof window !== 'undefined') {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setIsOnboardingComplete(true);
        }
        return { success: true };
      } else {
        setError(result.error || 'Login failed');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Register
  const register = async (email: string, password: string, name: string) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await authService.register(email, password, name);
      
      if (result.success) {
        await loadUser();
        // Automatycznie oznacz onboarding jako ukończony po rejestracji
        if (typeof window !== 'undefined') {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setIsOnboardingComplete(true);
        }
        return { success: true };
      } else {
        setError(result.error || 'Registration failed');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setProfile(null);
      setSteamIntegration(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (data: Record<string, unknown>) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await authService.updateUserProfile(user.$id, data);
    if (result.success) {
      await loadUser();
    }
    return result;
  };

  // Update password
  const updatePassword = async (newPassword: string, oldPassword: string) => {
    return authService.updatePassword(newPassword, oldPassword);
  };

  // Update name
  const updateName = async (name: string) => {
    const result = await authService.updateName(name);
    if (result.success) {
      await loadUser();
    }
    return result;
  };

  // Link Steam
  const linkSteam = async (steamId: string, steamData: SteamLinkData) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await steamService.linkSteamAccount(user.$id, steamId, steamData);
    if (result.success) {
      await loadUser();
    }
    return result;
  };

  // Unlink Steam
  const unlinkSteam = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await steamService.unlinkSteamAccount(user.$id);
    if (result.success) {
      setSteamIntegration(null);
      await loadUser();
    }
    return result;
  };

  // Complete onboarding
  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
    }
  };

  // Refresh user
  const refreshUser = loadUser;

  // Clear error
  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    profile,
    steamIntegration,
    isLoading,
    isAuthenticated: !!user,
    isOnboardingComplete,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    updateName,
    linkSteam,
    unlinkSteam,
    completeOnboarding,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
