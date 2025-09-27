// Steam API Integration
class SteamService {
  constructor() {
    this.apiKey = null;
    this.userId = null;
    this.baseUrl = 'https://api.steampowered.com';
    this.storeUrl = 'https://store.steampowered.com/api';
  }

  setCredentials(apiKey, userId) {
    this.apiKey = apiKey;
    this.userId = userId;
  }

  async getOwnedGames() {
    if (!this.apiKey || !this.userId) {
      throw new Error('Steam credentials not set');
    }

    try {
      const url = `${this.baseUrl}/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${this.userId}&format=json&include_appinfo=true&include_played_free_games=true`;
      
      // Use CORS proxy for browser requests
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Steam API error: ${response.status}`);
      }

      const data = await response.json();
      const steamData = JSON.parse(data.contents);
      
      return steamData.response.games?.map(game => ({
        id: game.appid.toString(),
        name: game.name,
        platform: 'steam',
        playtime: game.playtime_forever,
        lastPlayed: game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toISOString() : null,
        image: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        hero: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`,
        installed: true, // Assume installed for owned games
        achievements: null // Will be fetched separately
      })) || [];
    } catch (error) {
      console.error('Error fetching Steam games:', error);
      return [];
    }
  }

  async getGameDetails(appId) {
    try {
      const url = `${this.storeUrl}/appdetails?appids=${appId}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Steam Store API error: ${response.status}`);
      }

      const data = await response.json();
      const storeData = JSON.parse(data.contents);
      
      if (storeData[appId] && storeData[appId].success) {
        const gameData = storeData[appId].data;
        return {
          description: gameData.short_description,
          genres: gameData.genres?.map(g => g.description) || [],
          developers: gameData.developers || [],
          publishers: gameData.publishers || [],
          releaseDate: gameData.release_date?.date || null,
          price: gameData.price_overview?.final_formatted || 'Free',
          screenshots: gameData.screenshots?.map(s => s.path_full) || [],
          categories: gameData.categories?.map(c => c.description) || []
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching Steam game details:', error);
      return null;
    }
  }

  async getPlayerAchievements(appId) {
    if (!this.apiKey || !this.userId) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${this.apiKey}&steamid=${this.userId}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Steam Achievement API error: ${response.status}`);
      }

      const data = await response.json();
      const achievementData = JSON.parse(data.contents);
      
      if (achievementData.playerstats && achievementData.playerstats.achievements) {
        return {
          total: achievementData.playerstats.achievements.length,
          unlocked: achievementData.playerstats.achievements.filter(a => a.achieved === 1).length
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching Steam achievements:', error);
      return null;
    }
  }

  async launchGame(gameId) {
    if (window.electronAPI) {
      return await window.electronAPI.launchGame({
        platform: 'steam',
        gameId: gameId
      });
    } else {
      // Fallback for browser
      window.open(`steam://run/${gameId}`, '_blank');
      return { success: true };
    }
  }
}

export default new SteamService();