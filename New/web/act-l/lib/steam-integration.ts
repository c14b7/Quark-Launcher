/**
 * Steam Integration Service (Client-side)
 * 
 * This service provides Steam API integration for the launcher frontend.
 * It handles fetching friends, achievements, and stats either directly
 * or through the Appwrite Functions backend.
 */

import { databases, APPWRITE_CONFIG } from './appwrite';
import { Query } from 'appwrite';

const STEAM_API_BASE = 'https://api.steampowered.com';

export interface SteamPlayer {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  gameextrainfo?: string;
  gameid?: string;
  loccountrycode?: string;
}

export interface SteamFriend extends SteamPlayer {
  friendSince?: number;
  isOnline: boolean;
  currentGame?: string;
}

export interface SteamAchievement {
  apiname: string;
  name: string;
  description: string;
  achieved: boolean;
  unlocktime: number;
  icon: string;
  iconGray: string;
}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
}

export interface SteamStats {
  gamesOwned: number;
  totalPlaytime: number;
  steamLevel: number;
  recentGames: SteamGame[];
}

// Helper to check if Steam API key is configured
export function hasSteamApiKey(): boolean {
  if (typeof window !== 'undefined' && window.electronAPI) {
    // Check if running in Electron with local Steam API key
    return true;
  }
  return false;
}

// Format playtime from minutes to readable string
export function formatPlaytime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} godz.`;
  }
  const days = Math.floor(hours / 24);
  return `${days} dni`;
}

// Get persona state text
export function getPersonaStateText(state: number): string {
  const states: Record<number, string> = {
    0: 'Offline',
    1: 'Online',
    2: 'Zajęty',
    3: 'Zaraz wracam',
    4: 'Śpi',
    5: 'Chce handlować',
    6: 'Chce grać',
  };
  return states[state] || 'Nieznany';
}

// Steam Integration Service
export const steamIntegration = {
  /**
   * Get Steam player summary using local Steam API key
   */
  async getPlayerSummary(steamApiKey: string, steamId: string): Promise<SteamPlayer | null> {
    try {
      // Use CORS proxy or Electron IPC
      if (typeof window !== 'undefined' && window.electronAPI) {
        const response = await fetch(
          `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
        );
        const data = await response.json();
        return data.response?.players?.[0] || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching player summary:', error);
      return null;
    }
  },

  /**
   * Get friends list with summaries
   */
  async getFriendsWithSummaries(steamApiKey: string, steamId: string): Promise<SteamFriend[]> {
    try {
      // Get friends list
      const friendsResponse = await fetch(
        `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${steamApiKey}&steamid=${steamId}&relationship=friend`
      );
      const friendsData = await friendsResponse.json();
      const friends = friendsData.friendslist?.friends || [];

      if (friends.length === 0) {
        return [];
      }

      // Get summaries for all friends
      const steamIds = friends.map((f: { steamid: string }) => f.steamid).join(',');
      const summariesResponse = await fetch(
        `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamIds}`
      );
      const summariesData = await summariesResponse.json();
      const players = summariesData.response?.players || [];

      // Merge friend since data
      const friendsMap = new Map(friends.map((f: { steamid: string; friend_since: number }) => [f.steamid, f]));

      return players.map((player: SteamPlayer) => {
        const friendData = friendsMap.get(player.steamid) as { friend_since?: number } | undefined;
        return {
          ...player,
          friendSince: friendData?.friend_since,
          isOnline: player.personastate > 0,
          currentGame: player.gameextrainfo,
        };
      });
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  },

  /**
   * Get owned games
   */
  async getOwnedGames(steamApiKey: string, steamId: string): Promise<SteamGame[]> {
    try {
      const response = await fetch(
        `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
      );
      const data = await response.json();
      return data.response?.games || [];
    } catch (error) {
      console.error('Error fetching owned games:', error);
      return [];
    }
  },

  /**
   * Get recently played games
   */
  async getRecentlyPlayedGames(steamApiKey: string, steamId: string, count: number = 10): Promise<SteamGame[]> {
    try {
      const response = await fetch(
        `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${steamApiKey}&steamid=${steamId}&count=${count}`
      );
      const data = await response.json();
      return data.response?.games || [];
    } catch (error) {
      console.error('Error fetching recently played games:', error);
      return [];
    }
  },

  /**
   * Get achievements for a game
   */
  async getPlayerAchievements(steamApiKey: string, steamId: string, appId: number): Promise<SteamAchievement[]> {
    try {
      // Get player achievements
      const achievementsResponse = await fetch(
        `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`
      );
      const achievementsData = await achievementsResponse.json();
      
      if (!achievementsData.playerstats?.success) {
        return [];
      }

      // Get achievement schema for names and icons
      const schemaResponse = await fetch(
        `${STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}`
      );
      const schemaData = await schemaResponse.json();
      const schema = schemaData.game?.availableGameStats?.achievements || [];

      // Merge data
      const schemaMap = new Map(schema.map((a: { name: string; displayName: string; description: string; icon: string; icongray: string }) => [a.name, a]));

      return (achievementsData.playerstats.achievements || []).map((achievement: { apiname: string; achieved: number; unlocktime: number }) => {
        const schemaItem = schemaMap.get(achievement.apiname) as { displayName?: string; description?: string; icon?: string; icongray?: string } | undefined;
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
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }
  },

  /**
   * Get Steam level
   */
  async getSteamLevel(steamApiKey: string, steamId: string): Promise<number> {
    try {
      const response = await fetch(
        `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${steamApiKey}&steamid=${steamId}`
      );
      const data = await response.json();
      return data.response?.player_level || 0;
    } catch (error) {
      console.error('Error fetching Steam level:', error);
      return 0;
    }
  },

  /**
   * Get complete user stats
   */
  async getUserStats(steamApiKey: string, steamId: string): Promise<SteamStats | null> {
    try {
      const [games, recentGames, level] = await Promise.all([
        this.getOwnedGames(steamApiKey, steamId),
        this.getRecentlyPlayedGames(steamApiKey, steamId),
        this.getSteamLevel(steamApiKey, steamId),
      ]);

      const totalPlaytime = games.reduce((sum, game) => sum + (game.playtime_forever || 0), 0);

      return {
        gamesOwned: games.length,
        totalPlaytime,
        steamLevel: level,
        recentGames,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  },

  /**
   * Validate Steam ID
   */
  async validateSteamId(steamApiKey: string, steamId: string): Promise<boolean> {
    const player = await this.getPlayerSummary(steamApiKey, steamId);
    return player !== null;
  },

  /**
   * Resolve vanity URL to Steam ID
   */
  async resolveVanityUrl(steamApiKey: string, vanityUrl: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${steamApiKey}&vanityurl=${vanityUrl}`
      );
      const data = await response.json();
      
      if (data.response?.success === 1) {
        return data.response.steamid;
      }
      return null;
    } catch (error) {
      console.error('Error resolving vanity URL:', error);
      return null;
    }
  },

  /**
   * Get cached friends from Appwrite
   */
  async getCachedFriends(userId: string): Promise<SteamFriend[] | null> {
    try {
      const docs = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        'steam_friends_cache',
        [Query.equal('userId', userId)]
      );

      if (docs.documents.length > 0) {
        const data = docs.documents[0];
        const friendsData = data.friendsData as string;
        return JSON.parse(friendsData);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached friends:', error);
      return null;
    }
  },

  /**
   * Get cached achievements from Appwrite
   */
  async getCachedAchievements(userId: string, gameId: string): Promise<SteamAchievement[] | null> {
    try {
      const docs = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        'steam_achievements_cache',
        [Query.equal('userId', userId), Query.equal('gameId', gameId)]
      );

      if (docs.documents.length > 0) {
        const data = docs.documents[0];
        const achievementsData = data.achievementsData as string;
        return JSON.parse(achievementsData);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached achievements:', error);
      return null;
    }
  },

  /**
   * Get cached stats from Appwrite
   */
  async getCachedStats(userId: string): Promise<SteamStats | null> {
    try {
      const docs = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        'steam_stats_cache',
        [Query.equal('userId', userId)]
      );

      if (docs.documents.length > 0) {
        const data = docs.documents[0];
        return {
          gamesOwned: data.gamesOwned as number,
          totalPlaytime: data.totalPlaytime as number,
          steamLevel: 0,
          recentGames: JSON.parse(data.recentlyPlayedData as string),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting cached stats:', error);
      return null;
    }
  },
};

export default steamIntegration;
