const { app, BrowserWindow, ipcMain, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');



// --- update mechanism ---
const { autoUpdater } = require('electron-updater');


// Dodaj te dwie linijki pod importem:
autoUpdater.forceDevUpdateConfig = true;
autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = true;
// const log = require('electron-log'); // Opcjonalnie, warto mieć do logów aktualizacji

// Wyłączamy automatyczne pobieranie - chcemy najpierw pokazać banner użytkownikowi!
autoUpdater.autoDownload = false;

app.whenReady().then(() => {
  const win = this.createMainWindow(); // Twoja funkcja tworząca okno

  // Sprawdzamy dostępność aktualizacji chwile po uruchomieniu okna
  win.webContents.on('did-finish-load', () => {
    autoUpdater.checkForUpdates();
  });

  // Reagujemy na znalezienie nowej wersji
  autoUpdater.on('update-available', (info) => {
    // info.version -> string (np. "1.1.0")
    // info.releaseNotes -> string/array (Twoje "What's new" wpisane na GitHubie)
    win.webContents.send('update-available-to-ui', {
      version: info.version,
      releaseNotes: info.releaseNotes || 'Poprawki błędów i usprawnienia stabilności.'
    });
  });

  // Błędy podczas sprawdzania aktualizacji
  autoUpdater.on('error', (err) => {
    console.error('Błąd auto-updatera:', err);
  });

  // Kiedy paczka zostanie pobrana -> restart i instalacja
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
});

// Obsługa kliknięcia przycisku w Next.js przez invoke
ipcMain.handle('start-installation', async () => {
  autoUpdater.downloadUpdate(); // Zaczyna pobieranie w tle
  return true;
});

// --- koniec update mechanism ---


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
      this.setupAutoUpdater();
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
  // Wklej tę metodę wewnątrz klasy QuarkLauncher:
  setupAutoUpdater() {

    autoUpdater.logger = console;

  // Sprawdzamy dostępność aktualizacji po załadowaniu okna Next.js
  this.mainWindow.webContents.on('did-finish-load', () => {
    console.log('[UPDATER] Checking for updates...');
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('[UPDATER] Pre-check error:', err);
    });
  });
    // Sprawdzamy dostępność aktualizacji po załadowaniu okna Next.js
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('[UPDATER] Checking for updates...');
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('[UPDATER] Pre-check error:', err);
      });
    });

    // Reagujemy na znalezienie nowej wersji i wysyłamy info do frontendu
    autoUpdater.on('update-available', (info) => {
      console.log('[UPDATER] Update available:', info.version);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-available-to-ui', {
          version: info.version,
          releaseNotes: info.releaseNotes || 'Poprawki błędów i usprawnienia stabilności.'
        });
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('[UPDATER] Błąd auto-updatera:', err);
    });

    // Kiedy paczka zostanie pobrana -> restart i automatyczna instalacja
    autoUpdater.on('update-downloaded', () => {
      console.log('[UPDATER] Update downloaded. Quark Launcher will restart now.');
      autoUpdater.quitAndInstall();
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
        const seenIds = new Set();

        for (const folder of libraryFolders) {
          const appsPath = path.join(folder, 'steamapps');
          const folderGames = await this.scanSteamAppsFolder(appsPath);
          
          // Deduplicate games by ID
          for (const game of folderGames) {
            if (!seenIds.has(game.id)) {
              seenIds.add(game.id);
              games.push(game);
            }
          }
        }

        console.log('[STEAM] Total unique games found:', games.length);
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

    // ===== STEAM NEWS =====
    ipcMain.handle('steam-get-news', async (event, { appIds, count = 5 }) => {
      try {
        console.log('[STEAM NEWS] Getting news for apps:', appIds.slice(0, 5), '...');
        
        if (!appIds || appIds.length === 0) {
          return { success: true, data: [] };
        }

        const https = require('https');
        const allNews = [];
        
        // Pobierz newsy dla max 10 gier żeby nie przeciążyć
        const appsToFetch = appIds.slice(0, 10);
        
        const fetchNews = (appId) => new Promise((resolve) => {
          const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=300`;
          
          https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (parsed?.appnews?.newsitems) {
                  resolve(parsed.appnews.newsitems.map(item => ({
                    ...item,
                    appId: appId
                  })));
                } else {
                  resolve([]);
                }
              } catch (err) {
                resolve([]);
              }
            });
          }).on('error', () => resolve([]));
        });

        const newsResults = await Promise.all(appsToFetch.map(fetchNews));
        
        for (const newsItems of newsResults) {
          allNews.push(...newsItems);
        }

        // Sortuj po dacie (najnowsze pierwsze)
        allNews.sort((a, b) => b.date - a.date);

        console.log('[STEAM NEWS] Total news items:', allNews.length);
        return { success: true, data: allNews.slice(0, 20) };
      } catch (error) {
        console.error('[STEAM NEWS] Error:', error);
        return { success: false, error: error.message };
      }
    });

    // ===== STEAM RECENT ACHIEVEMENTS =====
    ipcMain.handle('steam-get-recent-achievements', async (event, { steamApiKey, steamId, appIds }) => {
      try {
        console.log('[STEAM RECENT ACH] Getting recent achievements for', appIds?.length || 0, 'games');
        
        if (!steamApiKey || !steamId || !appIds || appIds.length === 0) {
          return { success: true, data: [] };
        }

        const https = require('https');
        const twoWeeksAgo = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60); // 2 tygodnie temu
        const recentAchievements = [];
        
        // Pobierz osiągnięcia dla max 10 gier
        const appsToFetch = appIds.slice(0, 10);
        
        const fetchAchievements = (appId) => new Promise((resolve) => {
          const achievementsUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`;
          const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}`;
          
          let achievementsData = null;
          let schemaData = null;
          let completed = 0;
          
          const checkDone = () => {
            completed++;
            if (completed < 2) return;
            
            if (!achievementsData?.playerstats?.achievements) {
              resolve([]);
              return;
            }
            
            const schemaMap = new Map((schemaData?.game?.availableGameStats?.achievements || []).map(a => [a.name, a]));
            
            const recent = achievementsData.playerstats.achievements
              .filter(a => a.achieved === 1 && a.unlocktime >= twoWeeksAgo)
              .map(a => {
                const schema = schemaMap.get(a.apiname);
                return {
                  apiname: a.apiname,
                  name: schema?.displayName || a.apiname,
                  description: schema?.description || '',
                  icon: schema?.icon || '',
                  unlocktime: a.unlocktime,
                  appId: appId,
                  gameName: achievementsData.playerstats.gameName || `App ${appId}`
                };
              });
            
            resolve(recent);
          };
          
          https.get(achievementsUrl, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
              try { achievementsData = JSON.parse(data); } catch {}
              checkDone();
            });
          }).on('error', () => checkDone());
          
          https.get(schemaUrl, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
              try { schemaData = JSON.parse(data); } catch {}
              checkDone();
            });
          }).on('error', () => checkDone());
        });

        const results = await Promise.all(appsToFetch.map(fetchAchievements));
        
        for (const achievements of results) {
          recentAchievements.push(...achievements);
        }

        // Sortuj po dacie (najnowsze pierwsze)
        recentAchievements.sort((a, b) => b.unlocktime - a.unlocktime);

        console.log('[STEAM RECENT ACH] Found', recentAchievements.length, 'recent achievements');
        
        // Jeśli nie ma z ostatnich 2 tygodni, zwróć 3 ostatnie ogólnie
        if (recentAchievements.length === 0) {
          console.log('[STEAM RECENT ACH] No recent, fetching last 3 overall...');
          const allAchievements = [];
          
          for (const appId of appsToFetch) {
            const result = await fetchAchievements(appId);
            allAchievements.push(...result);
          }
          
          allAchievements.sort((a, b) => b.unlocktime - a.unlocktime);
          return { success: true, data: allAchievements.slice(0, 3), isRecent: false };
        }

        return { success: true, data: recentAchievements.slice(0, 10), isRecent: true };
      } catch (error) {
        console.error('[STEAM RECENT ACH] Error:', error);
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
    ipcMain.removeHandler('start-installation');

    ipcMain.handle('start-installation', async () => {
      console.log('[UPDATER] Next.js requested installation start. Downloading update...');
      autoUpdater.downloadUpdate();
  return true;
  });
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
      const cleanedName = displayName.replace(/[™®©:]/g, '').trim();
      
      // Krok 1: Próba wyszukania w API Sklepu Steam
      try {
        const steamSearchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanedName)}&l=english&cc=US`;
        const steamImages = await new Promise((resolve, reject) => {
          https.get(steamSearchUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  const json = JSON.parse(data);
                  if (json.items && json.items.length > 0) {
                    // Znajdź dokładne lub najlepsze dopasowanie
                    const match = json.items.find(item => item.name.toLowerCase() === cleanedName.toLowerCase() && item.type === 'app') || json.items[0];
                    if (match && match.id) {
                      const appId = match.id;
                      console.log(`[EPIC] Found Steam equivalent for ${displayName}: AppId ${appId}`);
                      resolve({
                        image: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
                        hero: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_hero.jpg`,
                        logo: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/logo.png`,
                        capsule: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900.jpg`,
                        background: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/page_bg_generated_v6b.jpg`
                      });
                      return;
                    }
                  }
                } catch (e) {}
              }
              resolve(null);
            });
          }).on('error', () => resolve(null));
        });

        if (steamImages) {
          // Zapisz do cache
          await fs.writeFile(cacheFile, JSON.stringify({
            timestamp: Date.now(),
            images: steamImages
          }));
          return steamImages;
        }
      } catch (err) {
        console.log('[EPIC] Steam API search failed:', err.message);
      }

      // Krok 2: Fallback - Wikipedia API
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
