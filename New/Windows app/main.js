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
      : `file://${path.join(process.resourcesPath, 'app', 'index.html')}`;

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
    // ===== STEAM API PROXY (fix CORS) =====
    ipcMain.handle('steam-api-fetch', async (event, { endpoint, params }) => {
      try {
        const https = require('https');
        const url = new URL(`https://api.steampowered.com${endpoint}`);
        
        // Add params to URL
        if (params) {
          Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        }

        return new Promise((resolve, reject) => {
          https.get(url.toString(), (res) => {
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                resolve({ success: true, data: JSON.parse(data) });
              } catch (err) {
                resolve({ success: false, error: 'Failed to parse JSON' });
              }
            });
          }).on('error', (err) => {
            reject({ success: false, error: err.message });
          });
        });
      } catch (error) {
        console.error('Steam API proxy error:', error);
        return { success: false, error: error.message };
      }
    });

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

    // ===== EPIC GAMES DETECTION =====
    ipcMain.handle('epic-get-installed-games', async () => {
      try {
        const manifestPath = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
        if (!await this.fileExists(manifestPath)) {
          console.log('Epic manifests folder not found');
          return [];
        }

        const games = await this.scanEpicManifests(manifestPath);
        return games;
      } catch (error) {
        console.error('Error getting Epic games:', error);
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
            // Epic Games - try multiple launch methods
            try {
              let epicAppName = gameId;
              
              if (gameId.includes(':')) {
                // Extract AppName from namespace:appName:catalogItemId
                const parts = gameId.split(':');
                epicAppName = parts[1];
              }
              
              console.log(`Launching Epic game with AppName: ${epicAppName}`);
              
              // Method 1: Try direct launcher execution with -com.epicgames.launcher
              const epicLauncherPaths = [
                'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
                'C:\\\\Program Files (x86)\\\\Epic Games\\\\Launcher\\\\Portal\\\\Binaries\\\\Win64\\\\EpicGamesLauncher.exe',
                'C:\\\\Program Files\\\\Epic Games\\\\Launcher\\\\Portal\\\\Binaries\\\\Win32\\\\EpicGamesLauncher.exe',
                'C:\\\\Program Files\\\\Epic Games\\\\Launcher\\\\Portal\\\\Binaries\\\\Win64\\\\EpicGamesLauncher.exe'
              ];
              
              let launched = false;
              for (const launcherPath of epicLauncherPaths) {
                if (await this.fileExists(launcherPath)) {
                  // Use Epic's command line format
                  const proc = spawn(launcherPath, [`-com.epicgames.launcher://apps/${epicAppName}?action=launch&silent=true`], {
                    detached: true,
                    stdio: 'ignore'
                  });
                  proc.unref();
                  launched = true;
                  console.log(`Launched via ${launcherPath}`);
                  break;
                }
              }
              
              // Method 2: Fallback to protocol handler
              if (!launched) {
                shell.openExternal(`com.epicgames.launcher://apps/${epicAppName}?action=launch&silent=true`);
              }
            } catch (err) {
              console.error('Epic launch error:', err);
              throw err;
            }
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

    // Open folder in explorer
    ipcMain.handle('open-folder', async (event, folderPath) => {
      try {
        if (await this.fileExists(folderPath)) {
          shell.openPath(folderPath);
          return { success: true };
        }
        return { success: false, error: 'Folder not found' };
      } catch (error) {
        return { success: false, error: error.message };
      }
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

  async scanEpicManifests(manifestPath) {
    const games = [];

    try {
      const files = await fs.readdir(manifestPath);
      const itemFiles = files.filter(f => f.endsWith('.item'));

      for (const itemFile of itemFiles) {
        try {
          const content = await fs.readFile(path.join(manifestPath, itemFile), 'utf-8');
          const manifest = JSON.parse(content);

          // Filtrowanie niepotrzebnych aplikacji
          if (manifest.AppName && manifest.DisplayName && 
              !manifest.DisplayName.includes('Launcher') &&
              !manifest.DisplayName.includes('Prerequisite') &&
              manifest.bIsApplication) {
            
            console.log(`Found Epic game: ${manifest.DisplayName} (${manifest.AppName})`);
            
            // Tworzenie ID w formacie namespace:appName:artifactId
            const launchId = `${manifest.CatalogNamespace}:${manifest.AppName}:${manifest.CatalogItemId}`;
            
            // Try to get images from multiple Epic CDN patterns
            const catalogNs = manifest.CatalogNamespace;
            const catalogId = manifest.CatalogItemId;
            const appName = manifest.AppName;
            
            // Try to find local images in multiple locations
            let gameImage = '';
            
            if (manifest.InstallLocation) {
              // Try multiple common icon locations
              const iconLocations = [
                // Check ContentCache first - most reliable
                path.join('C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\ContentCache', `${catalogId}_*.*`),
                path.join('C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\ContentCache', `${appName}_*.*`),
                // Then check game install directory
                path.join(manifest.InstallLocation, '.egstore', `${catalogId}.png`),
                path.join(manifest.InstallLocation, '.egstore', `${appName}.png`),
                path.join(manifest.InstallLocation, '.egstore', 'icon.png'),
                path.join(manifest.InstallLocation, 'icon.png'),
                path.join(manifest.InstallLocation, 'Icon.png'),
                path.join(manifest.InstallLocation, `${manifest.DisplayName}.png`)
              ];
              
              for (const iconPattern of iconLocations) {
                try {
                  // Check if pattern has wildcard
                  if (iconPattern.includes('*')) {
                    const dir = path.dirname(iconPattern);
                    const pattern = path.basename(iconPattern);
                    const files = await fs.readdir(dir);
                    const matching = files.find(f => {
                      const base = pattern.split('_')[0];
                      return f.startsWith(base) && (f.endsWith('.png') || f.endsWith('.jpg'));
                    });
                    if (matching) {
                      gameImage = `game-asset://${path.join(dir, matching)}`;
                      console.log(`Found icon for ${manifest.DisplayName}: ${path.join(dir, matching)}`);
                      break;
                    }
                  } else if (await this.fileExists(iconPattern)) {
                    gameImage = `game-asset://${iconPattern}`;
                    console.log(`Found icon for ${manifest.DisplayName}: ${iconPattern}`);
                    break;
                  }
                } catch (err) {
                  // Continue to next location
                }
              }
            }
            
            // If no local image, try using a generic Epic Games placeholder URL
            // Using a pattern that might work for some games
            const epicImageUrl = gameImage || `https://cdn2.unrealengine.com/epic-${appName.toLowerCase()}-1920x1080.jpg`;
            
            games.push({
              id: launchId,
              name: manifest.DisplayName,
              platform: 'epic',
              installDir: manifest.InstallLocation,
              sizeOnDisk: parseInt(manifest.InstallSize) || 0,
              lastUpdated: new Date(manifest.InstallDate).getTime() || 0,
              installed: true,
              appName: appName,
              namespace: catalogNs,
              catalogItemId: catalogId,
              launchExecutable: manifest.LaunchExecutable,
              // Store full game path if LaunchExecutable exists
              gamePath: manifest.LaunchExecutable && manifest.InstallLocation 
                ? path.join(manifest.InstallLocation, manifest.LaunchExecutable)
                : null,
              // Use local icon if available, otherwise use Epic CDN attempt
              image: epicImageUrl,
              hero: epicImageUrl,
              logo: epicImageUrl,
              capsule: epicImageUrl,
              background: epicImageUrl
            });
          }
        } catch (err) {
          console.log('Error parsing Epic manifest:', itemFile, err);
        }
      }
    } catch (error) {
      console.log('Error scanning Epic manifests:', error);
    }

    return games;
  }
}

new QuarkLauncher();
