const { contextBridge, ipcRenderer } = require('electron');

// Bezpieczne API dla renderer procesu
contextBridge.exposeInMainWorld('electronAPI', {
  // Steam API Proxy (fix CORS)
  steamApiFetch: (endpoint, params) => ipcRenderer.invoke('steam-api-fetch', { endpoint, params }),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Steam
  steamDetectInstallation: () => ipcRenderer.invoke('steam-detect-installation'),
  steamGetInstalledGames: () => ipcRenderer.invoke('steam-get-installed-games'),
  steamGetOwnedGames: (steamApiKey, steamId) => ipcRenderer.invoke('steam-get-owned-games', { steamApiKey, steamId }),
  steamGetAchievements: (steamApiKey, steamId, appId) => ipcRenderer.invoke('steam-get-achievements', { steamApiKey, steamId, appId }),
  steamGetNews: (appIds, count) => ipcRenderer.invoke('steam-get-news', { appIds, count }),
  steamGetRecentAchievements: (steamApiKey, steamId, appIds) => ipcRenderer.invoke('steam-get-recent-achievements', { steamApiKey, steamId, appIds }),
  steamOpenIdLogin: () => ipcRenderer.invoke('steam-openid-login'),

  // Epic Games
  epicGetInstalledGames: () => ipcRenderer.invoke('epic-get-installed-games'),

  // Game launching
  launchGame: (gameData) => ipcRenderer.invoke('launch-game', gameData),

  // User data
  saveUserData: (key, data) => ipcRenderer.invoke('save-user-data', { key, data }),
  loadUserData: (key) => ipcRenderer.invoke('load-user-data', { key }),

  // File operations
  selectGameExecutable: () => ipcRenderer.invoke('select-game-executable'),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

// ... Twój dotychczasowy kod preload ...

  // Platform
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // --- TUTAJ DOPISUJEMY AKTUALIZACJE ---
  // Pozwala Next.js czekać na sygnał o aktualizacji i przekazuje dane o "What's new"
  onUpdateAvailable: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-available-to-ui', subscription);
    return () => ipcRenderer.removeListener('update-available-to-ui', subscription);
  },

  onUpdateDownloadProgress: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-download-progress', subscription);
    return () => ipcRenderer.removeListener('update-download-progress', subscription);
  },

  onUpdateError: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-error-to-ui', subscription);
    return () => ipcRenderer.removeListener('update-error-to-ui', subscription);
  },

  onTelemetryMainEvent: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('telemetry-main-event', subscription);
    return () => ipcRenderer.removeListener('telemetry-main-event', subscription);
  },

  onOverlayToggled: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('overlay-toggled', subscription);
    return () => ipcRenderer.removeListener('overlay-toggled', subscription);
  },

  startInstallation: () => ipcRenderer.invoke('start-installation')
});

console.log('🚀 Quark preload script loaded');
