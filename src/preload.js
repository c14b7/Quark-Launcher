const { contextBridge, ipcRenderer } = require('electron');

// Bezpieczne API dla renderer procesu
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // Enhanced game launching
  launchGame: (gameData) => ipcRenderer.invoke('launch-game', gameData),

  // File operations
  selectGameExecutable: () => ipcRenderer.invoke('select-game-executable'),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),

  // Process management
  isProcessRunning: (processName) => ipcRenderer.invoke('is-process-running', processName),
  startProcess: (executablePath, args) => ipcRenderer.invoke('start-process', executablePath, args),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Platform detection
  detectSteam: () => ipcRenderer.invoke('detect-steam'),
  detectEpicLauncher: () => ipcRenderer.invoke('detect-epic-launcher'),

  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Steam API helper
contextBridge.exposeInMainWorld('steamAPI', {
  getOwnedGames: async (apiKey, steamId) => {
    try {
      const response = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`
      );
      return await response.json();
    } catch (error) {
      console.error('Steam API Error:', error);
      return null;
    }
  },
  
  getGameDetails: async (appId) => {
    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}`
      );
      return await response.json();
    } catch (error) {
      console.error('Steam Game Details Error:', error);
      return null;
    }
  }
});

// Xbox API helper
contextBridge.exposeInMainWorld('xboxAPI', {
  getInstalledGames: () => {
    // Xbox games detection będzie implementowane
    return [];
  }
});

console.log('Preload script loaded successfully');