// Xbox Game Pass & Microsoft Store Integration
class XboxService {
  constructor() {
    this.gameList = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      // Try to get Xbox games from local file first
      await this.loadLocalGameList();
      
      // In a real implementation, we would use Microsoft Graph API
      // or Windows GameBar API to get installed games
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Xbox service:', error);
      return false;
    }
  }

  async loadLocalGameList() {
    try {
      // Try to load from local storage or file
      const savedGames = localStorage.getItem('xbox_games');
      if (savedGames) {
        this.gameList = JSON.parse(savedGames);
        return;
      }

      // Fallback: Load mock Xbox games
      this.gameList = await this.getMockXboxGames();
      localStorage.setItem('xbox_games', JSON.stringify(this.gameList));
    } catch (error) {
      console.error('Error loading Xbox games:', error);
      this.gameList = [];
    }
  }

  async getMockXboxGames() {
    return [
      {
        id: 'forza-horizon-5',
        name: 'Forza Horizon 5',
        platform: 'xbox',
        image: 'https://store-images.s-microsoft.com/image/apps.6906.13894593655335594.8e7fab87-8cea-4a8b-9d96-a1c6e9438b78.8f2df8db-53ff-4d97-98c6-9cd0fc6ba568',
        hero: 'https://store-images.s-microsoft.com/image/apps.6906.13894593655335594.8e7fab87-8cea-4a8b-9d96-a1c6e9438b78.8f2df8db-53ff-4d97-98c6-9cd0fc6ba568',
        installed: true,
        lastPlayed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        playtime: 120,
        gamePassId: 'BT5P2X999VH2',
        storeUrl: 'https://www.microsoft.com/store/productId/9NKX70BBXVTG'
      },
      {
        id: 'halo-infinite',
        name: 'Halo Infinite',
        platform: 'xbox',
        image: 'https://store-images.s-microsoft.com/image/apps.31107.13727851868390641.c9cc5f63-e9c0-4ea2-a0be-2dbb8de9aec0.0b4bf5fb-0d8e-4bd2-96b3-66a8b4bf3e8e',
        hero: 'https://store-images.s-microsoft.com/image/apps.31107.13727851868390641.c9cc5f63-e9c0-4ea2-a0be-2dbb8de9aec0.0b4bf5fb-0d8e-4bd2-96b3-66a8b4bf3e8e',
        installed: true,
        lastPlayed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        playtime: 89,
        gamePassId: '9PP5G1F0H1LN',
        storeUrl: 'https://www.microsoft.com/store/productId/9PP5G1F0H1LN'
      },
      {
        id: 'sea-of-thieves',
        name: 'Sea of Thieves',
        platform: 'xbox',
        image: 'https://store-images.s-microsoft.com/image/apps.36202.14537127596318587.8d0983d7-5aba-4b2c-b5e5-716bf2d94d8c.a43d6a91-8e31-449b-97be-9dcf6efd8088',
        hero: 'https://store-images.s-microsoft.com/image/apps.36202.14537127596318587.8d0983d7-5aba-4b2c-b5e5-716bf2d94d8c.a43d6a91-8e31-449b-97be-9dcf6efd8088',
        installed: false,
        lastPlayed: null,
        playtime: 0,
        gamePassId: '9P2N57MC619K',
        storeUrl: 'https://www.microsoft.com/store/productId/9P2N57MC619K'
      }
    ];
  }

  async getOwnedGames() {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.gameList.map(game => ({
      ...game,
      rating: Math.random() * 2 + 3, // Mock rating 3-5
      achievements: Math.floor(Math.random() * 50) + 10,
      tags: ['Action', 'Adventure', 'Racing'].slice(0, Math.floor(Math.random() * 3) + 1)
    }));
  }

  async getGameDetails(gameId) {
    const game = this.gameList.find(g => g.id === gameId);
    if (!game) return null;

    // Mock detailed information
    return {
      description: `Experience ${game.name} on Xbox Game Pass. Amazing gameplay awaits!`,
      genres: ['Action', 'Adventure'],
      developers: ['Microsoft Studios'],
      publishers: ['Xbox Game Studios'],
      releaseDate: '2021-11-09',
      price: 'Included with Game Pass',
      screenshots: [game.image],
      categories: ['Single-player', 'Multiplayer']
    };
  }

  async launchGame(gameId) {
    const game = this.gameList.find(g => g.id === gameId);
    
    if (window.electronAPI) {
      return await window.electronAPI.launchGame({
        platform: 'xbox',
        gameId: game?.gamePassId || gameId
      });
    } else {
      // Fallback: open Microsoft Store
      if (game?.storeUrl) {
        window.open(game.storeUrl, '_blank');
      }
      return { success: true };
    }
  }

  async searchGamePass(query) {
    // Mock Game Pass search
    const mockResults = [
      {
        id: 'minecraft',
        name: 'Minecraft',
        platform: 'xbox',
        image: 'https://store-images.s-microsoft.com/image/apps.18751.13510798887490672.6b57e6f2-7eed-4267-8794-7c6f3db02e80.8d9b8214-57f3-4dc0-8b3f-0c3e3f5e8b52',
        gamePassId: '9NBLGGH537BL',
        available: true,
        price: 'Free with Game Pass'
      },
      {
        id: 'doom-eternal',
        name: 'DOOM Eternal',
        platform: 'xbox',
        image: 'https://store-images.s-microsoft.com/image/apps.46148.70928433136256320.4e38e3dc-39f5-4b2f-a4b7-5e2c4b7e2b14.3b4b6a45-6f4d-4b4d-9b6b-9f6b4b4b6b4b',
        gamePassId: '9P5S3Z4Z4Z4Z',
        available: true,
        price: 'Free with Game Pass'
      }
    ];

    return mockResults.filter(game => 
      game.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Check if Xbox Game Bar is available
  async checkXboxGameBarAvailable() {
    try {
      // In a real implementation, check Windows registry or API
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new XboxService();