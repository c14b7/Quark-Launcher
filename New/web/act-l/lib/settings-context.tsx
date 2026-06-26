'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { SteamUser, SteamFriend } from '@/lib/types';
import {
  DEFAULT_OVERLAY_SETTINGS,
  mergeOverlaySettings,
  syncOverlayConfigToElectron,
  type OverlaySettings,
} from '@/lib/overlay-settings';
import { reorderIds } from '@/lib/game-order';

export type { OverlaySettings };

export interface AppSettings {
  theme: 'dark' | 'oled';
  uiScale: number;
  locale: 'pl' | 'en';
  hiddenGames: string[];
  customCategories: Category[];
  libraryGameOrder?: string[];
  librarySortBy?: 'name' | 'lastPlayed' | 'playtime' | 'recent' | 'custom';
  overlay?: OverlaySettings;
  notifyFriendPlaying?: boolean;
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
  updateCategory: (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => void;
  removeCategory: (categoryId: string) => void;
  addGameToCategory: (categoryId: string, gameId: string) => void;
  removeGameFromCategory: (categoryId: string, gameId: string) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;
  reorderCategoryGames: (categoryId: string, fromIndex: number, toIndex: number) => void;
  reorderLibraryGames: (fromIndex: number, toIndex: number) => void;
  setLibraryGameOrder: (ids: string[]) => void;
  updateOverlaySettings: (updates: Partial<OverlaySettings>) => void;
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
  libraryGameOrder: [],
  librarySortBy: 'name',
  overlay: DEFAULT_OVERLAY_SETTINGS,
  notifyFriendPlaying: true,
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
          const loaded = result.data as AppSettings;
          setSettings({
            ...defaultSettings,
            ...loaded,
            overlay: mergeOverlaySettings(loaded.overlay),
          });
        }
      } else {
        const saved = localStorage.getItem('quark-settings');
        if (saved) {
          const loaded = JSON.parse(saved) as AppSettings;
          setSettings({
            ...defaultSettings,
            ...loaded,
            overlay: mergeOverlaySettings(loaded.overlay),
          });
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

  // Sync overlay config to Electron when settings change
  useEffect(() => {
    if (!isLoaded) return;
    void syncOverlayConfigToElectron(mergeOverlaySettings(settings.overlay));
  }, [settings.overlay, isLoaded]);

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

  const updateCategory = useCallback((categoryId: string, updates: Partial<Omit<Category, 'id'>>) => {
    setSettings(prev => ({
      ...prev,
      customCategories: prev.customCategories.map(c =>
        c.id === categoryId ? { ...c, ...updates } : c
      ),
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

  const reorderCategories = useCallback((fromIndex: number, toIndex: number) => {
    setSettings(prev => ({
      ...prev,
      customCategories: reorderIds(prev.customCategories.map(c => c.id), fromIndex, toIndex).map(
        (id) => prev.customCategories.find((c) => c.id === id)!
      ),
    }));
  }, []);

  const reorderCategoryGames = useCallback((categoryId: string, fromIndex: number, toIndex: number) => {
    setSettings(prev => ({
      ...prev,
      customCategories: prev.customCategories.map((c) =>
        c.id === categoryId
          ? { ...c, gameIds: reorderIds(c.gameIds, fromIndex, toIndex) }
          : c
      ),
    }));
  }, []);

  const setLibraryGameOrder = useCallback((ids: string[]) => {
    setSettings(prev => ({
      ...prev,
      libraryGameOrder: ids,
      librarySortBy: 'custom',
    }));
  }, []);

  const reorderLibraryGames = useCallback((fromIndex: number, toIndex: number) => {
    setSettings(prev => {
      const order = prev.libraryGameOrder?.length
        ? [...prev.libraryGameOrder]
        : [];
      return {
        ...prev,
        libraryGameOrder: reorderIds(order, fromIndex, toIndex),
        librarySortBy: 'custom',
      };
    });
  }, []);

  const updateOverlaySettings = useCallback((updates: Partial<OverlaySettings>) => {
    setSettings(prev => ({
      ...prev,
      overlay: mergeOverlaySettings({ ...prev.overlay, ...updates }),
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
        updateCategory,
        removeCategory,
        addGameToCategory,
        removeGameFromCategory,
        reorderCategories,
        reorderCategoryGames,
        reorderLibraryGames,
        setLibraryGameOrder,
        updateOverlaySettings,
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
