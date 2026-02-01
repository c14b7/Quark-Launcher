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

    // ===== STEAM PLAYTIME & STATS =====
    ipcMain.handle('steam-get-owned-games', async (event, { steamApiKey, steamId }) => {
      try {
        console.log('[STEAM API] GetOwnedGames called with:');
        console.log('  - API Key:', steamApiKey ? `${steamApiKey.substring(0, 8)}...` : 'MISSING');
        console.log('  - Steam ID:', steamId || 'MISSING');
        
        if (!steamApiKey || !steamId) {
          console.log('[STEAM API] ERROR: Missing Steam API key or Steam ID');
          return { success: false, error: 'Missing Steam API key or Steam ID' };
        }

        const https = require('https');
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`;
        console.log('[STEAM API] Fetching:', url.replace(steamApiKey, 'HIDDEN'));

        return new Promise((resolve) => {
          https.get(url, (res) => {
            console.log('[STEAM API] Response status:', res.statusCode);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                console.log('[STEAM API] Response received, parsing...');
                
                // Sprawdź czy są błędy w odpowiedzi
                if (json.response === undefined) {
                  console.log('[STEAM API] ERROR: Empty response, possible invalid API key or private profile');
                  console.log('[STEAM API] Raw response:', data.substring(0, 500));
                  resolve({ success: false, error: 'Empty response - check API key and profile visibility' });
                  return;
                }
                
                const games = json.response?.games || [];
                console.log('[STEAM API] Found', games.length, 'games');
                
                // Mapuj na format przyjazny dla frontendu
                const playtimeMap = {};
                for (const game of games) {
                  playtimeMap[game.appid.toString()] = {
                    playtime: game.playtime_forever || 0, // w minutach
                    playtime2weeks: game.playtime_2weeks || 0,
                    lastPlayed: game.rtime_last_played || 0
                  };
                }
                
                // Loguj kilka przykładów
                const sampleIds = Object.keys(playtimeMap).slice(0, 3);
                console.log('[STEAM API] Sample playtime data:', sampleIds.map(id => ({ id, ...playtimeMap[id] })));
                
                resolve({ success: true, data: playtimeMap });
              } catch (err) {
                console.log('[STEAM API] Parse error:', err.message);
                console.log('[STEAM API] Raw data:', data.substring(0, 200));
                resolve({ success: false, error: 'Failed to parse Steam response' });
              }
            });
          }).on('error', (err) => {
            console.log('[STEAM API] Network error:', err.message);
            resolve({ success: false, error: err.message });
          });
        });
      } catch (error) {
        console.error('[STEAM API] Steam owned games error:', error);
        return { success: false, error: error.message };
      }
    });

    // ===== STEAM ACHIEVEMENTS =====
    ipcMain.handle('steam-get-achievements', async (event, { steamApiKey, steamId, appId }) => {
      try {
        console.log('[STEAM ACHIEVEMENTS] GetAchievements called:');
        console.log('  - API Key:', steamApiKey ? `${steamApiKey.substring(0, 8)}...` : 'MISSING');
        console.log('  - Steam ID:', steamId || 'MISSING');
        console.log('  - App ID:', appId || 'MISSING');
        
        if (!steamApiKey || !steamId || !appId) {
          console.log('[STEAM ACHIEVEMENTS] ERROR: Missing parameters');
          return { success: false, error: 'Missing parameters' };
        }

        const https = require('https');
        
        // Pobierz osiągnięcia gracza
        const achievementsUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`;
        
        // Pobierz schemat osiągnięć (nazwy, ikony)
        const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}`;
        
        console.log('[STEAM ACHIEVEMENTS] Fetching achievements and schema...');

        const fetchJson = (url, name) => new Promise((resolve) => {
          https.get(url, (res) => {
            console.log(`[STEAM ACHIEVEMENTS] ${name} response status:`, res.statusCode);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve(json);
              } catch (err) {
                console.log(`[STEAM ACHIEVEMENTS] ${name} parse error:`, err.message);
                console.log(`[STEAM ACHIEVEMENTS] ${name} raw:`, data.substring(0, 200));
                resolve(null);
              }
            });
          }).on('error', (err) => {
            console.log(`[STEAM ACHIEVEMENTS] ${name} network error:`, err.message);
            resolve(null);
          });
        });

        const [achievementsData, schemaData] = await Promise.all([
          fetchJson(achievementsUrl, 'PlayerAchievements'),
          fetchJson(schemaUrl, 'Schema')
        ]);

        console.log('[STEAM ACHIEVEMENTS] Achievements data received:', achievementsData ? 'yes' : 'no');
        console.log('[STEAM ACHIEVEMENTS] Schema data received:', schemaData ? 'yes' : 'no');

        // Dodaj więcej debugowania
        if (achievementsData) {
          console.log('[STEAM ACHIEVEMENTS] playerstats:', JSON.stringify(achievementsData.playerstats || {}, null, 2).substring(0, 500));
        }

        if (!achievementsData?.playerstats?.success) {
          console.log('[STEAM ACHIEVEMENTS] No achievements or game has none');
          console.log('[STEAM ACHIEVEMENTS] Error message:', achievementsData?.playerstats?.error);
          // Jeśli profil prywatny, zwróć odpowiedni komunikat
          if (achievementsData?.playerstats?.error === 'Profile is not public') {
            return { success: false, error: 'Profil Steam jest prywatny. Ustaw widoczność profilu na publiczny.' };
          }
          return { success: true, data: [] };
        }

        const schema = schemaData?.game?.availableGameStats?.achievements || [];
        console.log('[STEAM ACHIEVEMENTS] Schema has', schema.length, 'achievements defined');
        if (schema.length > 0) {
          console.log('[STEAM ACHIEVEMENTS] Schema sample:', JSON.stringify(schema[0]));
        }
        const schemaMap = new Map(schema.map(a => [a.name, a]));

        const playerAchievements = achievementsData.playerstats.achievements || [];
        console.log('[STEAM ACHIEVEMENTS] Player has', playerAchievements.length, 'achievements');
        if (playerAchievements.length > 0) {
          console.log('[STEAM ACHIEVEMENTS] Player sample:', JSON.stringify(playerAchievements[0]));
        }

        const achievements = playerAchievements.map(achievement => {
          const schemaItem = schemaMap.get(achievement.apiname);
          return {
            apiname: achievement.apiname,
            name: schemaItem?.displayName || achievement.apiname,
            description: schemaItem?.description || '',
            achieved: achievement.achieved === 1,
            unlocktime: achievement.unlocktime,
            icon: schemaItem?.icon || '',
            iconGray: schemaItem?.icongray || '',
          };
        });

        console.log('[STEAM ACHIEVEMENTS] Returning', achievements.length, 'achievements');
        console.log('[STEAM ACHIEVEMENTS] Sample:', achievements.slice(0, 2));

        return { success: true, data: achievements };
      } catch (error) {
        console.error('[STEAM ACHIEVEMENTS] Error:', error);
        return { success: false, error: error.message };
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
            const gameId = game.appid?.toString() || '';
            console.log(`[STEAM SCAN] Found: ${game.name} (ID: ${gameId})`);
            games.push({
              id: gameId,
              name: game.name,
              platform: 'steam',
              installDir: game.installdir,
              sizeOnDisk: parseInt(game.SizeOnDisk) || 0,
              lastUpdated: parseInt(game.LastUpdated) || 0,
              installed: true,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/header.jpg`,
              hero: `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/library_hero.jpg`,
              logo: `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/logo.png`,
              capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`,
              background: `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/page_bg_generated_v6b.jpg`
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
            
            const catalogNs = manifest.CatalogNamespace;
            const catalogId = manifest.CatalogItemId;
            const appName = manifest.AppName;
            
            // Pobierz obrazek z Epic Games Store API
            const epicImages = await this.fetchEpicGameImages(catalogNs, catalogId, appName, manifest.DisplayName);
            
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
              gamePath: manifest.LaunchExecutable && manifest.InstallLocation 
                ? path.join(manifest.InstallLocation, manifest.LaunchExecutable)
                : null,
              image: epicImages.image,
              hero: epicImages.hero,
              logo: epicImages.logo,
              capsule: epicImages.capsule,
              background: epicImages.background
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

  // Pobierz obrazki gry Epic Games - używa Wikipedia/DBpedia lub generuje placeholder
  async fetchEpicGameImages(namespace, catalogId, appName, displayName) {
    // Domyślne obrazki placeholder
    const defaultImages = {
      image: '',
      hero: '',
      logo: '',
      capsule: '',
      background: ''
    };
    
    try {
      // Sprawdź czy mamy cache
      const cacheDir = path.join(this.userDataPath, 'cache');
      const cacheFile = path.join(cacheDir, `epic_${catalogId}.json`);
      
      // Utwórz folder cache jeśli nie istnieje
      try {
        await fs.mkdir(cacheDir, { recursive: true });
      } catch {}
      
      try {
        const cached = await fs.readFile(cacheFile, 'utf-8');
        const cachedData = JSON.parse(cached);
        // Cache ważny przez 30 dni
        if (cachedData.timestamp && Date.now() - cachedData.timestamp < 30 * 24 * 60 * 60 * 1000) {
          console.log(`[EPIC] Using cached images for ${displayName}`);
          return cachedData.images;
        }
      } catch {
        // Brak cache, kontynuuj
      }

      console.log(`[EPIC] Fetching images for: ${displayName}`);

      const https = require('https');
      
      // Wyczyść nazwę gry do wyszukiwania
      const cleanedName = displayName
        .replace(/[™®©:]/g, '')
        .replace(/\s+/g, '_')
        .trim();
      
      // Spróbuj pobrać obrazek z Wikimedia Commons przez Wikipedia API
      const searchQuery = encodeURIComponent(displayName.replace(/[™®©]/g, '').trim());
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${searchQuery}_(video_game)`;
      
      const images = await new Promise((resolve) => {
        https.get(wikiUrl, {
          headers: { 'User-Agent': 'QuarkLauncher/1.0 (contact@example.com)' }
        }, (res) => {
          console.log(`[EPIC] Wikipedia API response status: ${res.statusCode} for ${displayName}`);
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const json = JSON.parse(data);
                const thumbnail = json?.thumbnail?.source || json?.originalimage?.source || '';
                
                if (thumbnail) {
                  console.log(`[EPIC] Wikipedia image found for ${displayName}`);
                  resolve({
                    image: thumbnail,
                    hero: thumbnail,
                    logo: '',
                    capsule: thumbnail,
                    background: thumbnail
                  });
                  return;
                }
              }
              
              // Fallback: Spróbuj bez "(video_game)" w nazwie
              const altWikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${searchQuery}`;
              https.get(altWikiUrl, {
                headers: { 'User-Agent': 'QuarkLauncher/1.0 (contact@example.com)' }
              }, (res2) => {
                let data2 = '';
                res2.on('data', chunk => data2 += chunk);
                res2.on('end', () => {
                  try {
                    if (res2.statusCode === 200) {
                      const json2 = JSON.parse(data2);
                      const thumbnail2 = json2?.thumbnail?.source || json2?.originalimage?.source || '';
                      
                      if (thumbnail2) {
                        console.log(`[EPIC] Wikipedia alt image found for ${displayName}`);
                        resolve({
                          image: thumbnail2,
                          hero: thumbnail2,
                          logo: '',
                          capsule: thumbnail2,
                          background: thumbnail2
                        });
                        return;
                      }
                    }
                    console.log(`[EPIC] No Wikipedia image for ${displayName}`);
                    resolve(defaultImages);
                  } catch {
                    resolve(defaultImages);
                  }
                });
              }).on('error', () => resolve(defaultImages));
            } catch (err) {
              console.log('[EPIC] Wikipedia API parse error:', err.message);
              resolve(defaultImages);
            }
          });
        }).on('error', (err) => {
          console.log('[EPIC] Wikipedia API error:', err.message);
          resolve(defaultImages);
        });
      });

      // Zapisz do cache jeśli znaleziono obrazki
      if (images.image || images.hero) {
        try {
          await fs.writeFile(cacheFile, JSON.stringify({
            timestamp: Date.now(),
            images
          }));
          console.log(`[EPIC] Cached images for ${displayName}`);
        } catch (cacheErr) {
          console.log('[EPIC] Cache write error:', cacheErr.message);
        }
      }

      return images;
    } catch (error) {
      console.log(`[EPIC] Error fetching images for ${displayName}:`, error);
      return defaultImages;
    }
  }
}

new QuarkLauncher();
