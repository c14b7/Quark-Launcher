// Platform Manager - Unified interface for all game platforms
import SteamService from './SteamService.js';
import XboxService from './XboxService.js';
import EpicService from './EpicService.js';

class PlatformManager {
  constructor() {
    this.platforms = {
      steam: SteamService,
      xbox: XboxService,
      epic: EpicService
    };
    
    this.initialized = false;
    this.allGames = [];
  }

  async initialize() {
    try {
      // Initialize all platform services
      const initPromises = Object.values(this.platforms).map(service => 
        service.initialize().catch(error => {
          console.warn(`Failed to initialize platform service:`, error);
          return false;
        })
      );

      await Promise.all(initPromises);
      
      // Load all games from all platforms
      await this.refreshGameLibrary();
      
      this.initialized = true;
      console.log('Platform Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Platform Manager:', error);
      return false;
    }
  }

  async refreshGameLibrary() {
    try {
      const gamePromises = Object.entries(this.platforms).map(async ([platformName, service]) => {
        try {
          const games = await service.getOwnedGames();
          return games.map(game => ({
            ...game,
            platform: platformName,
            source: platformName
          }));
        } catch (error) {
          console.warn(`Failed to get games from ${platformName}:`, error);
          return [];
        }
      });

      const gameArrays = await Promise.all(gamePromises);
      this.allGames = gameArrays.flat();
      
      // Sort by last played and name
      this.allGames.sort((a, b) => {
        if (a.lastPlayed && b.lastPlayed) {
          return new Date(b.lastPlayed) - new Date(a.lastPlayed);
        } else if (a.lastPlayed) {
          return -1;
        } else if (b.lastPlayed) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });

      return this.allGames;
    } catch (error) {
      console.error('Error refreshing game library:', error);
      return [];
    }
  }

  // Get all games across platforms
  async getAllGames() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.allGames;
  }

  // Get games from specific platform
  async getGamesByPlatform(platformName) {
    if (!this.platforms[platformName]) {
      throw new Error(`Platform ${platformName} not supported`);
    }
    
    return await this.platforms[platformName].getOwnedGames();
  }

  // Get recently played games across all platforms
  getRecentlyPlayed(limit = 10) {
    return this.allGames
      .filter(game => game.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
      .slice(0, limit);
  }

  // Get most played games
  getMostPlayed(limit = 10) {
    return this.allGames
      .filter(game => game.playtime > 0)
      .sort((a, b) => b.playtime - a.playtime)
      .slice(0, limit);
  }

  // Get installed games
  getInstalledGames() {
    return this.allGames.filter(game => game.installed);
  }

  // Search across all platforms
  searchGames(query) {
    const searchTerm = query.toLowerCase();
    return this.allGames.filter(game =>
      game.name.toLowerCase().includes(searchTerm) ||
      (game.tags && game.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }

  // Filter games by criteria
  filterGames(criteria) {
    let filtered = [...this.allGames];

    if (criteria.platform && criteria.platform !== 'all') {
      filtered = filtered.filter(game => game.platform === criteria.platform);
    }

    if (criteria.installed !== undefined) {
      filtered = filtered.filter(game => game.installed === criteria.installed);
    }

    if (criteria.genre) {
      filtered = filtered.filter(game => 
        game.tags && game.tags.some(tag => 
          tag.toLowerCase().includes(criteria.genre.toLowerCase())
        )
      );
    }

    if (criteria.rating) {
      filtered = filtered.filter(game => game.rating >= criteria.rating);
    }

    return filtered;
  }

  // Launch game from any platform
  async launchGame(gameId, platform) {
    if (!this.platforms[platform]) {
      throw new Error(`Platform ${platform} not supported`);
    }

    try {
      const result = await this.platforms[platform].launchGame(gameId);
      
      // Update last played time
      const gameIndex = this.allGames.findIndex(g => g.id === gameId && g.platform === platform);
      if (gameIndex !== -1) {
        this.allGames[gameIndex].lastPlayed = new Date().toISOString();
      }

      return result;
    } catch (error) {
      console.error(`Error launching game ${gameId} on ${platform}:`, error);
      throw error;
    }
  }

  // Get game details from specific platform
  async getGameDetails(gameId, platform) {
    if (!this.platforms[platform]) {
      throw new Error(`Platform ${platform} not supported`);
    }

    return await this.platforms[platform].getGameDetails(gameId);
  }

  // Get platform statistics
  getPlatformStats() {
    const stats = {
      total: this.allGames.length,
      installed: this.allGames.filter(g => g.installed).length,
      platforms: {}
    };

    Object.keys(this.platforms).forEach(platform => {
      const platformGames = this.allGames.filter(g => g.platform === platform);
      stats.platforms[platform] = {
        total: platformGames.length,
        installed: platformGames.filter(g => g.installed).length,
        totalPlaytime: platformGames.reduce((sum, game) => sum + (game.playtime || 0), 0)
      };
    });

    return stats;
  }

  // Get featured/hero games for carousel
  getFeaturedGames(limit = 5) {
    // Prioritize recently played, highly rated, or games with hero images
    const candidates = this.allGames.filter(game => 
      game.hero || game.rating >= 4 || game.lastPlayed
    );

    return candidates
      .sort((a, b) => {
        // Sort by rating and recent activity
        const aScore = (a.rating || 0) + (a.lastPlayed ? 1 : 0);
        const bScore = (b.rating || 0) + (b.lastPlayed ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  // Check platform service availability
  async getPlatformStatus() {
    const status = {};
    
    for (const [name, service] of Object.entries(this.platforms)) {
      try {
        // Try to call a method to check if service is working
        await service.getOwnedGames();
        status[name] = { available: true, error: null };
      } catch (error) {
        status[name] = { available: false, error: error.message };
      }
    }

    return status;
  }

  // Add custom game (non-platform game)
  addCustomGame(gameData) {
    const customGame = {
      ...gameData,
      id: `custom-${Date.now()}`,
      platform: 'custom',
      source: 'custom',
      installed: true,
      lastPlayed: null,
      playtime: 0
    };

    this.allGames.unshift(customGame);
    this.saveCustomGames();
    return customGame;
  }

  // Remove custom game
  removeCustomGame(gameId) {
    const index = this.allGames.findIndex(g => g.id === gameId && g.platform === 'custom');
    if (index !== -1) {
      this.allGames.splice(index, 1);
      this.saveCustomGames();
      return true;
    }
    return false;
  }

  // Save custom games to localStorage
  saveCustomGames() {
    const customGames = this.allGames.filter(g => g.platform === 'custom');
    localStorage.setItem('custom_games', JSON.stringify(customGames));
  }

  // Load custom games from localStorage
  async loadCustomGames() {
    try {
      const saved = localStorage.getItem('custom_games');
      if (saved) {
        const customGames = JSON.parse(saved);
        this.allGames = [...this.allGames.filter(g => g.platform !== 'custom'), ...customGames];
      }
    } catch (error) {
      console.error('Error loading custom games:', error);
    }
  }
}

export default new PlatformManager();