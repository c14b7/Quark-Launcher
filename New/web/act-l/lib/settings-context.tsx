'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SteamUser, SteamFriend } from '@/lib/types';

export interface AppSettings {
  theme: 'dark' | 'oled';
  uiScale: number;
  locale: 'pl' | 'en';
  hiddenGames: string[];
  customCategories: Category[];
  steamApiKey?: string;
  steamUserId?: string;
  // AI Chat settings
  aiServerUrl?: string;
  aiApiToken?: string;
  aiModel?: string;
}

export interface Category {
  id: string;
  name: string;
  gameIds: string[];
  color: string;
  icon?: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  hideGame: (gameId: string) => void;
  unhideGame: (gameId: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  removeCategory: (categoryId: string) => void;
  addGameToCategory: (categoryId: string, gameId: string) => void;
  removeGameFromCategory: (categoryId: string, gameId: string) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  // Steam user data
  steamUser: SteamUser | null;
  setSteamUser: (user: SteamUser | null) => void;
  steamFriends: SteamFriend[];
  setSteamFriends: (friends: SteamFriend[]) => void;
  isLoggedIn: boolean;
  logout: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  uiScale: 1,
  locale: 'pl',
  hiddenGames: [],
  customCategories: [],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [steamUser, setSteamUser] = useState<SteamUser | null>(null);
  const [steamFriends, setSteamFriends] = useState<SteamFriend[]>([]);

  // Wykorzystujemy useCallback, żeby móc bezpiecznie wrzucić tę funkcję do zależności useEffect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveSettings = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.saveUserData('settings', settings);
      } else {
        localStorage.setItem('quark-settings', JSON.stringify(settings));
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [settings]);

  // Tradycyjne funkcje (function) podlegają hoistingowi, dzięki czemu useEffect na górze widzi je bez błędu ESLinta
  async function loadSteamUser() {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.loadUserData('steamUser');
        if (result.success && result.data) {
          setSteamUser(result.data as SteamUser);
        }
        const friendsResult = await window.electronAPI.loadUserData('steamFriends');
        if (friendsResult.success && friendsResult.data) {
          setSteamFriends(friendsResult.data as SteamFriend[]);
        }
      } else {
        const savedUser = localStorage.getItem('quark-steam-user');
        if (savedUser) {
          setSteamUser(JSON.parse(savedUser));
        }
        const savedFriends = localStorage.getItem('quark-steam-friends');
        if (savedFriends) {
          setSteamFriends(JSON.parse(savedFriends));
        }
      }
    } catch (err) {
      console.error('Failed to load Steam user:', err);
    }
  }

  async function saveSteamUser(user: SteamUser | null) {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.saveUserData('steamUser', user);
      } else {
        if (user) {
          localStorage.setItem('quark-steam-user', JSON.stringify(user));
        } else {
          localStorage.removeItem('quark-steam-user');
        }
      }
    } catch (err) {
      console.error('Failed to save Steam user:', err);
    }
  }

  async function loadSettings() {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.loadUserData('settings');
        if (result.success && result.data) {
          setSettings({ ...defaultSettings, ...(result.data as AppSettings) });
        }
      } else {
        const saved = localStorage.getItem('quark-settings');
        if (saved) {
          setSettings({ ...defaultSettings, ...JSON.parse(saved) });
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setIsLoaded(true);
  }

  function applyTheme(theme: 'dark' | 'oled') {
    const html = document.documentElement;
    html.classList.remove('dark', 'oled');
    html.classList.add(theme);
  }

  function applyScale(scale: number) {
    document.documentElement.style.setProperty('--ui-scale', scale.toString());
    document.body.style.fontSize = `${scale * 14}px`;
  }

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadSteamUser();
  }, []);

  // Apply theme & scale when they change
  useEffect(() => {
    if (isLoaded) {
      applyTheme(settings.theme);
      applyScale(settings.uiScale);
    }
  }, [settings.theme, settings.uiScale, isLoaded]);

  // Persist all settings (categories, hidden games, etc.)
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => saveSettings(), 400);
    return () => clearTimeout(timer);
  }, [settings, isLoaded, saveSettings]);

  // Callbacki dla akcji użytkownika
  const handleSetSteamUser = useCallback((user: SteamUser | null) => {
    setSteamUser(user);
    saveSteamUser(user);
  }, []);

  const logout = useCallback(() => {
    setSteamUser(null);
    setSteamFriends([]);
    saveSteamUser(null);
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.saveUserData('steamFriends', []);
    } else {
      localStorage.removeItem('quark-steam-friends');
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const hideGame = useCallback((gameId: string) => {
    setSettings(prev => ({
      ...prev,
      hiddenGames: [...prev.hiddenGames, gameId]
    }));
  }, []);

  const unhideGame = useCallback((gameId: string) => {
    setSettings(prev => ({
      ...prev,
      hiddenGames: prev.hiddenGames.filter(id => id !== gameId)
    }));
  }, []);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: `cat_${Date.now()}`
    };
    setSettings(prev => ({
      ...prev,
      customCategories: [...prev.customCategories, newCategory]
    }));
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setSettings(prev => ({
      ...prev,
      customCategories: prev.customCategories.filter(c => c.id !== categoryId)
    }));
  }, []);

  const addGameToCategory = useCallback((categoryId: string, gameId: string) => {
    setSettings(prev => ({
      ...prev,
      customCategories: prev.customCategories.map(c =>
        c.id === categoryId && !c.gameIds.includes(gameId)
          ? { ...c, gameIds: [...c.gameIds, gameId] }
          : c
      )
    }));
  }, []);

  const removeGameFromCategory = useCallback((categoryId: string, gameId: string) => {
    setSettings(prev => ({
      ...prev,
      customCategories: prev.customCategories.map(c =>
        c.id === categoryId
          ? { ...c, gameIds: c.gameIds.filter(id => id !== gameId) }
          : c
      )
    }));
  }, []);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const isLoggedIn = steamUser !== null;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        hideGame,
        unhideGame,
        addCategory,
        removeCategory,
        addGameToCategory,
        removeGameFromCategory,
        isSettingsOpen,
        openSettings,
        closeSettings,
        steamUser,
        setSteamUser: handleSetSteamUser,
        steamFriends,
        setSteamFriends,
        isLoggedIn,
        logout
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
