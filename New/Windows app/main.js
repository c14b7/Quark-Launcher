const { app, BrowserWindow, ipcMain, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');

const isDev = !app.isPackaged;

class QuarkLauncher {
  constructor() {
    this.mainWindow = null;
    this.runningProcesses = new Map();
    this.userDataPath = app.getPath('userData');
    this.initializeApp();
  }

  initializeApp() {
    // Włącz hardware acceleration
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    
    app.whenReady().then(async () => {
      await this.ensureUserDataDir();
      this.createMainWindow();
      this.setupIpcHandlers();
      this.registerProtocols();

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

  async ensureUserDataDir() {
    const dirs = ['games', 'cache', 'settings'];
    for (const dir of dirs) {
      const dirPath = path.join(this.userDataPath, dir);
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (err) {
        console.log('Dir exists:', dirPath);
      }
    }
  }

  registerProtocols() {
    protocol.registerFileProtocol('game-asset', (request, callback) => {
      const url = request.url.replace('game-asset://', '');
      callback({ path: decodeURIComponent(url) });
    });
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 1280,
      minHeight: 800,
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      show: false,
      backgroundColor: '#0a0a0a',
      transparent: false,
      roundedCorners: true
    });

    // Ładowanie aplikacji Next.js
    const startUrl = isDev
      ? 'http://localhost:30211'
      : `file://${path.join(__dirname, '../web/act-l/out/index.html')}`;

    this.mainWindow.loadURL(startUrl);

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
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
    // ===== WINDOW CONTROLS =====
    ipcMain.handle('window-minimize', () => this.mainWindow.minimize());
    
    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
      return this.mainWindow.isMaximized();
    });
    
    ipcMain.handle('window-close', () => this.mainWindow.close());
    
    ipcMain.handle('window-is-maximized', () => this.mainWindow.isMaximized());

    // ===== STEAM DETECTION =====
    ipcMain.handle('steam-detect-installation', async () => {
      const steamPaths = [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        'D:\\Steam',
        'E:\\Steam'
      ];

      for (const steamPath of steamPaths) {
        if (await this.fileExists(path.join(steamPath, 'Steam.exe'))) {
          return { found: true, path: steamPath };
        }
      }
      return { found: false, path: null };
    });

    ipcMain.handle('steam-get-installed-games', async () => {
      try {
        const steamPath = await this.findSteamPath();
        if (!steamPath) return [];

        const libraryFolders = await this.getSteamLibraryFolders(steamPath);
        const games = [];

        for (const folder of libraryFolders) {
          const appsPath = path.join(folder, 'steamapps');
          const folderGames = await this.scanSteamAppsFolder(appsPath);
          games.push(...folderGames);
        }

        return games;
      } catch (error) {
        console.error('Error getting Steam games:', error);
        return [];
      }
    });

    // ===== GAME LAUNCHING =====
    ipcMain.handle('launch-game', async (event, { platform, gameId, gamePath }) => {
      try {
        console.log(`Launching game: ${gameId} on ${platform}`);

        switch (platform) {
          case 'steam':
            shell.openExternal(`steam://rungameid/${gameId}`);
            break;
          case 'xbox':
            shell.openExternal(`ms-xbl-${gameId}://`);
            break;
          case 'epic':
            shell.openExternal(`com.epicgames.launcher://apps/${gameId}?action=launch`);
            break;
          case 'custom':
            if (gamePath && await this.fileExists(gamePath)) {
              const proc = spawn(gamePath, [], { detached: true });
              this.runningProcesses.set(gameId, proc);
              proc.on('close', () => this.runningProcesses.delete(gameId));
            }
            break;
          default:
            throw new Error(`Unknown platform: ${platform}`);
        }

        return { success: true };
      } catch (error) {
        console.error('Launch error:', error);
        return { success: false, error: error.message };
      }
    });

    // ===== USER DATA =====
    ipcMain.handle('save-user-data', async (event, { key, data }) => {
      try {
        const filePath = path.join(this.userDataPath, 'settings', `${key}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('load-user-data', async (event, { key }) => {
      try {
        const filePath = path.join(this.userDataPath, 'settings', `${key}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: JSON.parse(content) };
      } catch (error) {
        return { success: true, data: null };
      }
    });

    // ===== FILE OPERATIONS =====
    ipcMain.handle('select-game-executable', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Executable', extensions: ['exe'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('check-file-exists', async (event, filePath) => {
      return await this.fileExists(filePath);
    });

    // ===== SYSTEM INFO =====
    ipcMain.handle('get-system-info', () => ({
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    }));
  }

  // ===== HELPER METHODS =====
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async findSteamPath() {
    const paths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam'
    ];

    for (const p of paths) {
      if (await this.fileExists(path.join(p, 'Steam.exe'))) {
        return p;
      }
    }
    return null;
  }

  async getSteamLibraryFolders(steamPath) {
    const folders = [steamPath];
    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');

    try {
      const content = await fs.readFile(vdfPath, 'utf-8');
      const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
      
      if (pathMatches) {
        for (const match of pathMatches) {
          const p = match.match(/"path"\s+"([^"]+)"/)[1].replace(/\\\\/g, '\\');
          if (!folders.includes(p) && await this.fileExists(p)) {
            folders.push(p);
          }
        }
      }
    } catch (error) {
      console.log('Could not read library folders:', error);
    }

    return folders;
  }

  async scanSteamAppsFolder(appsPath) {
    const games = [];

    try {
      const files = await fs.readdir(appsPath);
      const acfFiles = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));

      for (const acfFile of acfFiles) {
        try {
          const content = await fs.readFile(path.join(appsPath, acfFile), 'utf-8');
          const game = this.parseAcfFile(content);
          
          if (game && game.name && !game.name.includes('Proton') && !game.name.includes('Steamworks')) {
            games.push({
              id: game.appid,
              name: game.name,
              platform: 'steam',
              installDir: game.installdir,
              sizeOnDisk: parseInt(game.SizeOnDisk) || 0,
              lastUpdated: parseInt(game.LastUpdated) || 0,
              installed: true,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
              hero: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`,
              logo: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/logo.png`,
              capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`,
              background: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/page_bg_generated_v6b.jpg`
            });
          }
        } catch (err) {
          console.log('Error parsing ACF:', acfFile);
        }
      }
    } catch (error) {
      console.log('Error scanning apps folder:', error);
    }

    return games;
  }

  parseAcfFile(content) {
    const result = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^\s*"(\w+)"\s+"([^"]*)"/);
      if (match) {
        result[match[1]] = match[2];
      }
    }

    return result;
  }
}

new QuarkLauncher();
