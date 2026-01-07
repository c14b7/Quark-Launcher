const { contextBridge, ipcRenderer } = require('electron');

// Bezpieczne API dla renderer procesu
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Steam
  steamDetectInstallation: () => ipcRenderer.invoke('steam-detect-installation'),
  steamGetInstalledGames: () => ipcRenderer.invoke('steam-get-installed-games'),

  // Game launching
  launchGame: (gameData) => ipcRenderer.invoke('launch-game', gameData),

  // User data
  saveUserData: (key, data) => ipcRenderer.invoke('save-user-data', { key, data }),
  loadUserData: (key) => ipcRenderer.invoke('load-user-data', { key }),

  // File operations
  selectGameExecutable: () => ipcRenderer.invoke('select-game-executable'),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Platform
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

console.log('🚀 Quark Launcher preload script loaded');
