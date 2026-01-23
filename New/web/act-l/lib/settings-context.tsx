'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface AppSettings {
  theme: 'dark' | 'oled';
  uiScale: number; // 0.8 - 1.5
  hiddenGames: string[];
  customCategories: Category[];
  steamApiKey?: string;
  steamUserId?: string;
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
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  uiScale: 1,
  hiddenGames: [],
  customCategories: [],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const initSettings = async () => {
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const result = await window.electronAPI.loadUserData('settings');
          if (result.success && result.data) {
            setSettings({ ...defaultSettings, ...(result.data as AppSettings) });
          }
        } else {
          // Browser fallback
          const saved = localStorage.getItem('quark-settings');
          if (saved) {
            setSettings({ ...defaultSettings, ...JSON.parse(saved) });
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
      setIsLoaded(true);
    };
    
    initSettings();
  }, []);

  // Apply theme when settings change
  useEffect(() => {
    if (isLoaded) {
      // Apply theme
      const html = document.documentElement;
      html.classList.remove('dark', 'oled');
      html.classList.add(settings.theme);
      
      // Apply scale
      document.documentElement.style.setProperty('--ui-scale', settings.uiScale.toString());
      document.body.style.fontSize = `${settings.uiScale * 14}px`;
      
      // Save settings
      const saveSettings = async () => {
        try {
          if (typeof window !== 'undefined' && window.electronAPI) {
            await window.electronAPI.saveUserData('settings', settings);
          } else {
            localStorage.setItem('quark-settings', JSON.stringify(settings));
          }
        } catch (err) {
          console.error('Failed to save settings:', err);
        }
      };
      saveSettings();
    }
  }, [settings, isLoaded]);

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
        c.id === categoryId
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
        closeSettings
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
