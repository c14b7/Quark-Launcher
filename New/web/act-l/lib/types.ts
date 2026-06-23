// Quark Friend (in-app social)
export interface QuarkFriend {
  userId: string;
  displayName: string;
  bio?: string;
  avatarFileId?: string | null;
  bannerFileId?: string | null;
  presence: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  cardTheme?: string;
  lastSeen?: string | null;
  createdAt?: string;
}

export interface CardTheme {
  accentColor: string;
  gradientPreset?: string;
  glowEnabled?: boolean;
}

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
  apiname?: string;
  name: string;
  description: string;
  iconUrl: string;
  iconGrayUrl: string;
  icon?: string;
  iconGray?: string;
  achieved: boolean;
  unlockTime?: number;
  unlocktime?: number;
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

// Interfejs informacji o aktualizacji przekazywany do UI
export interface UpdateInfo {
  version: string;
  releaseNotes: string;
}

export interface UpdateDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateErrorInfo {
  message: string;
}

// --- NAPRAWIONA SEKCJA ELECTRON API ---

export interface IElectronAPI {
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<boolean>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  
  // Steam
  steamDetectInstallation: () => Promise<SteamInstallation>;
  steamGetInstalledGames: () => Promise<Game[]>;
  steamGetOwnedGames: (steamApiKey: string, steamId: string) => Promise<{
    success: boolean;
    data?: Record<string, { playtime: number; playtime2weeks: number; lastPlayed: number }>;
    error?: string;
  }>;
  steamGetAchievements: (steamApiKey: string, steamId: string, appId: string) => Promise<{
    success: boolean;
    data?: GameAchievement[];
    error?: string;
  }>;
  steamGetNews: (appIds: string[], count?: number) => Promise<{
    success: boolean;
    data?: Array<{
      gid: string;
      title: string;
      url: string;
      is_external_url: boolean;
      author: string;
      contents: string;
      feedlabel: string;
      date: number;
      feedname: string;
      appId: string;
      feed_type: number;
    }>;
    error?: string;
  }>;
  steamGetRecentAchievements: (steamApiKey: string, steamId: string, appIds: string[]) => Promise<{
    success: boolean;
    data?: Array<{
      apiname: string;
      name: string;
      description: string;
      icon: string;
      unlocktime: number;
      appId: string;
      gameName: string;
    }>;
    error?: string;
  }>;
  steamOpenIdLogin: () => Promise<{ success: boolean; steamId?: string; error?: string }>;
  
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
  
  // --- UPDATE MECHANISM ---
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloadProgress: (callback: (info: UpdateDownloadProgress) => void) => () => void;
  onUpdateError: (callback: (info: UpdateErrorInfo) => void) => () => void;
  startInstallation: () => Promise<{ success: boolean; error?: string }>;
  
  // Platform & Versions
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export {};