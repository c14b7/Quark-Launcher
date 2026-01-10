// Types for the Quark Launcher

export interface Game {
  id: string;
  name: string;
  platform: 'steam' | 'xbox' | 'epic' | 'custom';
  installed: boolean;
  installDir?: string;
  sizeOnDisk?: number;
  lastUpdated?: number;
  lastPlayed?: string;
  playtime?: number; // in minutes
  
  // Images
  image: string;        // Header (460x215)
  hero: string;         // Hero background (1920x620)
  logo: string;         // Game logo transparent
  capsule: string;      // Vertical capsule (600x900)
  background: string;   // Full background
  
  // Details
  description?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  releaseDate?: string;
  
  // User data
  isFavorite?: boolean;
  isHidden?: boolean;
  customCategories?: string[];
  
  // Steam-specific data
  achievements?: GameAchievement[];
  achievementProgress?: number; // percentage 0-100
}

// Steam User Profile
export interface SteamUser {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  avatarMediumUrl: string;
  avatarFullUrl: string;
  profileUrl: string;
  isOnline: boolean;
  lastLogoff?: number;
  countryCode?: string;
}

// Steam Friend
export interface SteamFriend {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  isOnline: boolean;
  currentGame?: string;
  friendSince?: number;
}

// Game Achievement
export interface GameAchievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  iconGrayUrl: string;
  achieved: boolean;
  unlockTime?: number;
}

// AI Chat Message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Playtime badge type
export type PlaytimeBadge = 'new-never' | 'new-beginner' | 'played' | null;

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  favoriteGames: string[];
  hiddenGames: string[];
  categories: Category[];
  steamApiKey?: string;
  steamUserId?: string;
}

export interface Category {
  id: string;
  name: string;
  games: string[];
  color?: string;
}

export interface LaunchResult {
  success: boolean;
  error?: string;
}

export interface SteamInstallation {
  found: boolean;
  path: string | null;
}

// Electron API types
declare global {
  interface Window {
    electronAPI?: {
      // Window controls
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<boolean>;
      windowClose: () => Promise<void>;
      windowIsMaximized: () => Promise<boolean>;
      
      // Steam
      steamDetectInstallation: () => Promise<SteamInstallation>;
      steamGetInstalledGames: () => Promise<Game[]>;
      
      // Epic Games
      epicGetInstalledGames: () => Promise<Game[]>;
      
      // Game launching
      launchGame: (gameData: { platform: string; gameId: string; gamePath?: string }) => Promise<LaunchResult>;
      
      // User data
      saveUserData: (key: string, data: unknown) => Promise<{ success: boolean; error?: string }>;
      loadUserData: (key: string) => Promise<{ success: boolean; data: unknown }>;
      
      // File operations
      selectGameExecutable: () => Promise<string | null>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      
      // System info
      getSystemInfo: () => Promise<{
        platform: string;
        arch: string;
        electronVersion: string;
        nodeVersion: string;
      }>;
      
      // Platform
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}

export {};
