// Epic Games Store Integration
class EpicService {
  constructor() {
    this.gameList = [];
    this.initialized = false;
    this.epicLauncherPath = null;
  }

  async initialize() {
    try {
      // Try to detect Epic Games Launcher installation
      await this.detectEpicLauncher();
      
      // Load game library
      await this.loadGameLibrary();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Epic service:', error);
      return false;
    }
  }

  async detectEpicLauncher() {
    if (window.electronAPI) {
      // Check common Epic launcher paths
      const paths = [
        'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
        'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe'
      ];
      
      for (const path of paths) {
        try {
          const exists = await window.electronAPI.checkFileExists(path);
          if (exists) {
            this.epicLauncherPath = path;
            return true;
          }
        } catch (error) {
          continue;
        }
      }
    }
    return false;
  }

  async loadGameLibrary() {
    try {
      // Try to load from local storage
      const savedGames = localStorage.getItem('epic_games');
      if (savedGames) {
        this.gameList = JSON.parse(savedGames);
        return;
      }

      // Load mock Epic games
      this.gameList = await this.getMockEpicGames();
      localStorage.setItem('epic_games', JSON.stringify(this.gameList));
    } catch (error) {
      console.error('Error loading Epic games:', error);
      this.gameList = [];
    }
  }

  async getMockEpicGames() {
    return [
      {
        id: 'fortnite',
        name: 'Fortnite',
        platform: 'epic',
        image: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg',
        hero: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg',
        installed: true,
        lastPlayed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        playtime: 340,
        freeToPlay: true,
        appName: 'Fortnite',
        namespace: 'fn'
      },
      {
        id: 'rocket-league',
        name: 'Rocket League',
        platform: 'epic',
        image: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15',
        hero: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15',
        installed: true,
        lastPlayed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        playtime: 180,
        freeToPlay: true,
        appName: 'Sugar',
        namespace: 'sugarysnowchance'
      },
      {
        id: 'cyberpunk-2077',
        name: 'Cyberpunk 2077',
        platform: 'epic',
        image: 'https://cdn1.epicgames.com/offer/77f2b98e2cef40c8a7437518bf420e47/EGS_Cyberpunk2077_CDPROJEKTRED_S2_03_1200x1600-b1f2b18e833caa8d4921fc721331643d',
        hero: 'https://cdn1.epicgames.com/offer/77f2b98e2cef40c8a7437518bf420e47/EGS_Cyberpunk2077_CDPROJEKTRED_S2_03_1200x1600-b1f2b18e833caa8d4921fc721331643d',
        installed: false,
        lastPlayed: null,
        playtime: 0,
        freeToPlay: false,
        appName: 'Ginger',
        namespace: 'b8c1c83a7c254e9b9e6b5d3e8c4f1a6a'
      },
      {
        id: 'gta-5',
        name: 'Grand Theft Auto V',
        platform: 'epic',
        image: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg',
        hero: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg',
        installed: true,
        lastPlayed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        playtime: 450,
        freeToPlay: false,
        appName: '9d2d0eb64d5c44529cece33fe2a46482',
        namespace: '0584d2013f0149a791e7b9bad0eec102'
      }
    ];
  }

  async getOwnedGames() {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.gameList.map(game => ({
      ...game,
      rating: Math.random() * 2 + 3,
      achievements: game.freeToPlay ? 0 : Math.floor(Math.random() * 40) + 5,
      tags: ['Action', 'Adventure', 'Shooter', 'RPG', 'Racing'].slice(0, Math.floor(Math.random() * 3) + 1)
    }));
  }

  async getGameDetails(gameId) {
    const game = this.gameList.find(g => g.id === gameId);
    if (!game) return null;

    return {
      description: `${game.name} on Epic Games Store. ${game.freeToPlay ? 'Free to play!' : 'Premium gaming experience.'}`,
      genres: ['Action', 'Adventure'],
      developers: ['Epic Games', 'Various'],
      publishers: ['Epic Games Store'],
      releaseDate: '2020-12-10',
      price: game.freeToPlay ? 'Free to Play' : '$59.99',
      screenshots: [game.image],
      categories: game.freeToPlay ? 
        ['Free to Play', 'Multiplayer', 'Online'] : 
        ['Single-player', 'Story Rich', 'Open World']
    };
  }

  async launchGame(gameId) {
    const game = this.gameList.find(g => g.id === gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }

    if (window.electronAPI) {
      // Use Epic Games Launcher protocol
      const launchUrl = `com.epicgames.launcher://apps/${game.namespace}%3A${game.appName}%3A${game.namespace}?action=launch&silent=true`;
      
      return await window.electronAPI.launchGame({
        platform: 'epic',
        gameId: gameId,
        launchUrl: launchUrl
      });
    } else {
      // Fallback: show Epic store page
      window.open(`https://store.epicgames.com/p/${gameId}`, '_blank');
      return { success: true };
    }
  }

  async getWeeklyFreeGames() {
    // Mock weekly free games (in a real app, this would query Epic's GraphQL API)
    return [
      {
        id: 'free-game-1',
        name: 'Weekly Free Game',
        image: 'https://cdn1.epicgames.com/offer/placeholder/placeholder-1200x1600.jpg',
        originalPrice: '$29.99',
        discountPercentage: 100,
        available: true,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  async searchStore(query) {
    // Mock store search
    const mockResults = [
      {
        id: 'metro-exodus',
        name: 'Metro Exodus',
        platform: 'epic',
        image: 'https://cdn1.epicgames.com/offer/c4763f236d6640fbb8c52f15373f2db5/EGS_MetroExodus_4AGames_S2_1200x1600-f85c26c8b4e148ce90b43c31f6e2e3c4',
        price: '$19.99',
        originalPrice: '$39.99',
        discount: 50
      },
      {
        id: 'control',
        name: 'Control',
        platform: 'epic',
        image: 'https://cdn1.epicgames.com/catnip/offer/Control-2560x1440-1abaa37a8ba9cc25fb60951bcc27b5d8',
        price: '$14.99',
        originalPrice: '$29.99',
        discount: 50
      }
    ];

    return mockResults.filter(game => 
      game.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Check Epic launcher status
  async isLauncherRunning() {
    if (window.electronAPI) {
      return await window.electronAPI.isProcessRunning('EpicGamesLauncher.exe');
    }
    return false;
  }

  async startEpicLauncher() {
    if (window.electronAPI && this.epicLauncherPath) {
      return await window.electronAPI.startProcess(this.epicLauncherPath);
    }
    return false;
  }
}

export default new EpicService();