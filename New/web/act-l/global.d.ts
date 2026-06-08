// global.d.ts

export {};

declare global {
  interface Window {
    electronAPI: {
      // --- DOTYCHCZASOWE METODY ---
      steamApiFetch: (endpoint: string, params: Record<string, string>) => Promise<{ success: boolean; data?: any; error?: string; }>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowIsMaximized: () => Promise<boolean>;
      steamDetectInstallation: () => Promise<any>;
      steamGetInstalledGames: () => Promise<any>;
      steamGetOwnedGames: (steamApiKey: string, steamId: string) => Promise<any>;
      steamGetAchievements: (steamApiKey: string, steamId: string, appId: string) => Promise<any>;
      steamGetNews: (appIds: string[], count: number) => Promise<any>;
      steamGetRecentAchievements: (steamApiKey: string, steamId: string, appIds: string[]) => Promise<any>;
      epicGetInstalledGames: () => Promise<any>;
      launchGame: (gameData: any) => Promise<any>;
      saveUserData: (key: string, data: any) => Promise<any>;
      loadUserData: (key: string) => Promise<any>;
      selectGameExecutable: () => Promise<string>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      openFolder: (folderPath: string) => Promise<any>;
      getSystemInfo: () => Promise<any>;
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };

      // --- NOWE METODY DLA AKTUALIZACJI ---
      onUpdateAvailable: (
        callback: (info: { version: string; releaseNotes: string }) => void
      ) => () => void;
      
      startInstallation: () => Promise<boolean>;
    };
  }
}