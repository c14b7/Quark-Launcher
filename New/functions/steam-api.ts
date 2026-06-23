/**
 * Steam API Service for Appwrite Functions
 * 
 * This module provides functions to interact with Steam Web API
 * for fetching user data, friends, achievements, and game stats.
 */

import { Client, Databases, Query } from 'node-appwrite';
import { verifyAuth } from './lib/middleware';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTIONS } from './lib/config';

const STEAM_API_BASE = 'https://api.steampowered.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSteamJson(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

// Configuration - DATABASE_ID imported from config

async function verifySteamAccess(
  databases: Databases,
  authUserId: string | null,
  steamId: string
): Promise<boolean> {
  if (!authUserId) return false;
  const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.steamIntegrations, [
    Query.equal('userId', authUserId),
    Query.equal('steamId', steamId),
    Query.limit(1),
  ]);
  return docs.documents.length > 0;
}

interface SteamPlayer {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  profilestate: number;
  lastlogoff?: number;
  commentpermission?: number;
  realname?: string;
  primaryclanid?: string;
  timecreated?: number;
  gameid?: string;
  gameserverip?: string;
  gameextrainfo?: string;
  loccountrycode?: string;
  locstatecode?: string;
  loccityid?: number;
}

interface SteamFriend {
  steamid: string;
  relationship: string;
  friend_since: number;
}

interface SteamGame {
  appid: number;
  name?: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
  img_logo_url?: string;
}

interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
  name?: string;
  description?: string;
}

interface SteamAchievementSchema {
  name: string;
  defaultvalue: number;
  displayName: string;
  hidden: number;
  description: string;
  icon: string;
  icongray: string;
}

// Steam API Functions
export const steamApi = {
  /**
   * Get Steam player summary
   */
  async getPlayerSummary(steamApiKey: string, steamId: string): Promise<SteamPlayer | null> {
    try {
      const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`;
      const data = await fetchSteamJson(url);
      
      if (data.response?.players?.length > 0) {
        return data.response.players[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching player summary:', error);
      return null;
    }
  },

  /**
   * Get Steam friends list
   */
  async getFriendsList(steamApiKey: string, steamId: string): Promise<SteamFriend[]> {
    try {
      const url = `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${steamApiKey}&steamid=${steamId}&relationship=friend`;
      const data = await fetchSteamJson(url);
      
      return data.friendslist?.friends || [];
    } catch (error) {
      console.error('Error fetching friends list:', error);
      return [];
    }
  },

  /**
   * Get friends with their summaries
   */
  async getFriendsWithSummaries(steamApiKey: string, steamId: string): Promise<SteamPlayer[]> {
    try {
      // First get friends list
      const friends = await this.getFriendsList(steamApiKey, steamId);
      
      if (friends.length === 0) {
        return [];
      }

      // Get summaries for all friends (Steam API accepts up to 100 steamids)
      const steamIds = friends.map(f => f.steamid).join(',');
      const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamIds}`;
      const data = await fetchSteamJson(url);
      
      return data.response?.players || [];
    } catch (error) {
      console.error('Error fetching friends with summaries:', error);
      return [];
    }
  },

  /**
   * Get owned games for a user
   */
  async getOwnedGames(steamApiKey: string, steamId: string, includeAppInfo: boolean = true): Promise<SteamGame[]> {
    try {
      const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=${includeAppInfo ? 1 : 0}&include_played_free_games=1`;
      const data = await fetchSteamJson(url);
      
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
      const url = `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${steamApiKey}&steamid=${steamId}&count=${count}`;
      const data = await fetchSteamJson(url);
      
      return data.response?.games || [];
    } catch (error) {
      console.error('Error fetching recently played games:', error);
      return [];
    }
  },

  /**
   * Get game achievements for a user
   */
  async getPlayerAchievements(steamApiKey: string, steamId: string, appId: number): Promise<SteamAchievement[]> {
    try {
      const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`;
      const data = await fetchSteamJson(url);
      
      if (data.playerstats?.success) {
        return data.playerstats.achievements || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching player achievements:', error);
      return [];
    }
  },

  /**
   * Get game achievement schema (names, descriptions, icons)
   */
  async getGameAchievementSchema(steamApiKey: string, appId: number): Promise<SteamAchievementSchema[]> {
    try {
      const url = `${STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}`;
      const data = await fetchSteamJson(url);
      
      return data.game?.availableGameStats?.achievements || [];
    } catch (error) {
      console.error('Error fetching achievement schema:', error);
      return [];
    }
  },

  /**
   * Get full achievements with schema data
   */
  async getFullAchievements(steamApiKey: string, steamId: string, appId: number) {
    try {
      const [playerAchievements, schema] = await Promise.all([
        this.getPlayerAchievements(steamApiKey, steamId, appId),
        this.getGameAchievementSchema(steamApiKey, appId),
      ]);

      // Merge player achievements with schema
      const schemaMap = new Map(schema.map(a => [a.name, a]));
      
      return playerAchievements.map(achievement => {
        const schemaData = schemaMap.get(achievement.apiname);
        return {
          ...achievement,
          name: schemaData?.displayName || achievement.apiname,
          description: schemaData?.description || '',
          icon: schemaData?.icon || '',
          iconGray: schemaData?.icongray || '',
        };
      });
    } catch (error) {
      console.error('Error fetching full achievements:', error);
      return [];
    }
  },

  /**
   * Get user's Steam level
   */
  async getSteamLevel(steamApiKey: string, steamId: string): Promise<number> {
    try {
      const url = `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${steamApiKey}&steamid=${steamId}`;
      const data = await fetchSteamJson(url);
      
      return data.response?.player_level || 0;
    } catch (error) {
      console.error('Error fetching Steam level:', error);
      return 0;
    }
  },

  /**
   * Validate Steam ID by checking if profile exists
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
      const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${steamApiKey}&vanityurl=${vanityUrl}`;
      const data = await fetchSteamJson(url);
      
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
   * Calculate total playtime across all games
   */
  calculateTotalPlaytime(games: SteamGame[]): number {
    return games.reduce((total, game) => total + (game.playtime_forever || 0), 0);
  },

  /**
   * Get user's complete stats summary
   */
  async getUserStatsSummary(steamApiKey: string, steamId: string) {
    try {
      const [player, games, recentGames, level] = await Promise.all([
        this.getPlayerSummary(steamApiKey, steamId),
        this.getOwnedGames(steamApiKey, steamId),
        this.getRecentlyPlayedGames(steamApiKey, steamId),
        this.getSteamLevel(steamApiKey, steamId),
      ]);

      if (!player) {
        return null;
      }

      return {
        profile: player,
        stats: {
          gamesOwned: games.length,
          totalPlaytime: this.calculateTotalPlaytime(games),
          steamLevel: level,
          recentGames: recentGames,
        },
      };
    } catch (error) {
      console.error('Error fetching user stats summary:', error);
      return null;
    }
  },
};

// Appwrite Function Handlers
export async function handleSteamApiRequest(req: any, res: any) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID || APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || APPWRITE_API_KEY);

  const databases = new Databases(client);
  const steamApiKey = process.env.STEAM_API_KEY || '';

  const body = JSON.parse(req.payload || req.body || '{}');
  const { action, steamId, userId: bodyUserId, appId } = body;
  const authUserId = await verifyAuth(req);
  const userId = authUserId || bodyUserId;

  const requiresAuth = ['getFriends', 'getAchievements', 'getStatsSummary', 'getCachedFriends'];
  if (requiresAuth.includes(action) && !authUserId) {
    return res.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, 401);
  }

  if (requiresAuth.includes(action) && steamId) {
    const allowed = await verifySteamAccess(databases, authUserId, steamId);
    if (!allowed) {
      return res.json({ success: false, code: 'FORBIDDEN', error: 'Steam account not linked' }, 403);
    }
  }

  try {
    switch (action) {
      case 'getPlayerSummary': {
        const data = await steamApi.getPlayerSummary(steamApiKey, steamId);
        return res.json({ success: true, data });
      }

      case 'getFriends': {
        const data = await steamApi.getFriendsWithSummaries(steamApiKey, steamId);

        if (authUserId) {
          await cacheFriendsData(databases, authUserId, steamId, data);
        }

        return res.json({ success: true, data });
      }

      case 'getOwnedGames': {
        const data = await steamApi.getOwnedGames(steamApiKey, steamId);
        return res.json({ success: true, data });
      }

      case 'getAchievements': {
        if (!appId) {
          return res.json({ success: false, error: 'appId is required' });
        }
        const data = await steamApi.getFullAchievements(steamApiKey, steamId, parseInt(appId));
        
        // Cache achievements if userId provided
        if (userId) {
          await cacheAchievementsData(databases, userId, steamId, appId, data);
        }
        
        return res.json({ success: true, data });
      }

      case 'getStatsSummary': {
        const data = await steamApi.getUserStatsSummary(steamApiKey, steamId);
        
        // Cache stats if userId provided
        if (userId && data) {
          await cacheStatsData(databases, userId, steamId, data.stats);
        }
        
        return res.json({ success: true, data });
      }

      case 'validateSteamId': {
        const isValid = await steamApi.validateSteamId(steamApiKey, steamId);
        return res.json({ success: true, data: { isValid } });
      }

      case 'resolveVanityUrl': {
        const resolvedSteamId = await steamApi.resolveVanityUrl(steamApiKey, steamId);
        return res.json({ success: true, data: { steamId: resolvedSteamId } });
      }

      case 'getCachedFriends': {
        if (!authUserId) {
          return res.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, 401);
        }
        const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.steamFriendsCache, [
          Query.equal('userId', authUserId),
          Query.limit(1),
        ]);
        if (docs.documents.length === 0) {
          return res.json({ success: true, data: null });
        }
        const friendsData = docs.documents[0].friendsData as string;
        return res.json({ success: true, data: JSON.parse(friendsData || '[]') });
      }

      default:
        return res.json({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Steam API error:', error);
    return res.json({ success: false, error: 'Steam API request failed' });
  }
}

// Cache helper functions
async function cacheFriendsData(databases: Databases, userId: string, steamId: string, data: any) {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      'steam_friends_cache',
      [Query.equal('userId', userId)]
    );

    const docData = {
      userId,
      steamId,
      friendsData: JSON.stringify(data),
      lastUpdated: new Date().toISOString(),
    };

    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        'steam_friends_cache',
        existing.documents[0].$id,
        docData
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        'steam_friends_cache',
        'unique()',
        docData
      );
    }
  } catch (error) {
    console.error('Error caching friends data:', error);
  }
}

async function cacheAchievementsData(databases: Databases, userId: string, steamId: string, gameId: string, data: any) {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      'steam_achievements_cache',
      [Query.equal('userId', userId), Query.equal('gameId', gameId)]
    );

    const docData = {
      userId,
      steamId,
      gameId,
      achievementsData: JSON.stringify(data),
      lastUpdated: new Date().toISOString(),
    };

    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        'steam_achievements_cache',
        existing.documents[0].$id,
        docData
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        'steam_achievements_cache',
        'unique()',
        docData
      );
    }
  } catch (error) {
    console.error('Error caching achievements data:', error);
  }
}

async function cacheStatsData(databases: Databases, userId: string, steamId: string, stats: any) {
  try {
    const existing = await databases.listDocuments(
      DATABASE_ID,
      'steam_stats_cache',
      [Query.equal('userId', userId)]
    );

    const docData = {
      userId,
      steamId,
      gamesOwned: stats.gamesOwned,
      totalPlaytime: stats.totalPlaytime,
      recentlyPlayedData: JSON.stringify(stats.recentGames),
      lastUpdated: new Date().toISOString(),
    };

    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        'steam_stats_cache',
        existing.documents[0].$id,
        docData
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        'steam_stats_cache',
        'unique()',
        docData
      );
    }
  } catch (error) {
    console.error('Error caching stats data:', error);
  }
}
