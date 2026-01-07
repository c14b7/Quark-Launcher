const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

class QuarkLauncher {
  constructor() {
    this.mainWindow = null;
    this.runningProcesses = new Map();
    this.initializeApp();
  }

  initializeApp() {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIpcHandlers();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      frame: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false
      },
      show: false,
      backgroundColor: '#0a0a0a',
      vibrancy: 'ultra-dark',
      transparent: false,
      roundedCorners: true
    });

    // Ładowanie aplikacji
    const startUrl = isDev || !app.isPackaged
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // Pokazanie okna po załadowaniu
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Otwórz DevTools w trybie dev
      if (isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Obsługa linków zewnętrznych
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  setupIpcHandlers() {
    // Window controls
    ipcMain.handle('window-minimize', () => {
      this.mainWindow.minimize();
    });

    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.handle('window-close', () => {
      this.mainWindow.close();
    });

    // Game launching with enhanced platform support
    ipcMain.handle('launch-game', async (event, { platform, gameId, gamePath, launchUrl }) => {
      try {
        console.log(`Launching game: ${gameId} on ${platform}`);
        
        switch (platform) {
          case 'steam':
            // Steam protocol launch
            shell.openExternal(`steam://run/${gameId}`);
            break;
            
          case 'xbox':
            // Xbox/Microsoft Store launch
            if (gameId.startsWith('BT5P2X') || gameId.startsWith('9N') || gameId.startsWith('9P')) {
              // Game Pass ID format
              shell.openExternal(`ms-xbl-${gameId}:`);
            } else {
              // Try alternative Xbox launch methods
              shell.openExternal(`ms-windows-store://pdp/?productId=${gameId}`);
            }
            break;
            
          case 'epic':
            // Epic Games Launcher protocol
            if (launchUrl) {
              shell.openExternal(launchUrl);
            } else {
              shell.openExternal(`com.epicgames.launcher://apps/${gameId}?action=launch`);
            }
            break;
            
          case 'custom':
            // Custom executable launch
            if (gamePath && await this.fileExists(gamePath)) {
              const process = spawn(gamePath, [], { detached: true });
              this.runningProcesses.set(gameId, process);
              
              process.on('error', (error) => {
                console.error(`Game launch error: ${error}`);
                this.runningProcesses.delete(gameId);
              });
              
              process.on('close', () => {
                this.runningProcesses.delete(gameId);
              });
            } else {
              throw new Error('Game executable not found');
            }
            break;
            
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Game launch error:', error);
        return { success: false, error: error.message };
      }
    });

    // Check if file exists
    ipcMain.handle('check-file-exists', async (event, filePath) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });

    // Check if process is running (Windows)
    ipcMain.handle('is-process-running', async (event, processName) => {
      return new Promise((resolve) => {
        if (process.platform !== 'win32') {
          resolve(false);
          return;
        }
        
        exec(`tasklist /FI "IMAGENAME eq ${processName}" /FO CSV`, (error, stdout) => {
          if (error) {
            resolve(false);
            return;
          }
          
          const lines = stdout.split('\n');
          resolve(lines.length > 2); // Header + at least one process
        });
      });
    });

    // Start external process
    ipcMain.handle('start-process', async (event, executablePath, args = []) => {
      try {
        if (!(await this.fileExists(executablePath))) {
          throw new Error('Executable not found');
        }
        
        const process = spawn(executablePath, args, { detached: true });
        return { success: true, pid: process.pid };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // File operations
    ipcMain.handle('select-game-executable', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Executable Files', extensions: ['exe', 'app'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      return result.canceled ? null : result.filePaths[0];
    });

    // System info with enhanced details
    ipcMain.handle('get-system-info', async () => {
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        version: process.getSystemVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      };
      
      // Add Windows-specific info
      if (process.platform === 'win32') {
        try {
          systemInfo.windowsVersion = await this.getWindowsVersion();
        } catch (error) {
          console.warn('Could not get Windows version:', error);
        }
      }
      
      return systemInfo;
    });

    // Platform detection helpers
    ipcMain.handle('detect-steam', async () => {
      const steamPaths = [
        'C:\\Program Files (x86)\\Steam\\Steam.exe',
        'C:\\Program Files\\Steam\\Steam.exe',
        path.join(process.env.APPDATA || '', 'Steam\\Steam.exe')
      ];
      
      for (const steamPath of steamPaths) {
        if (await this.fileExists(steamPath)) {
          return { found: true, path: steamPath };
        }
      }
      
      return { found: false, path: null };
    });

    ipcMain.handle('detect-epic-launcher', async () => {
      const epicPaths = [
        'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
        'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe'
      ];
      
      for (const epicPath of epicPaths) {
        if (await this.fileExists(epicPath)) {
          return { found: true, path: epicPath };
        }
      }
      
      return { found: false, path: null };
    });
  }

  // Utility methods
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getWindowsVersion() {
    return new Promise((resolve, reject) => {
      exec('ver', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}

new QuarkLauncher();