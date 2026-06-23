"use strict";
/**
 * Steam API Service for Appwrite Functions
 *
 * This module provides functions to interact with Steam Web API
 * for fetching user data, friends, achievements, and game stats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.steamApi = void 0;
exports.handleSteamApiRequest = handleSteamApiRequest;
const node_appwrite_1 = require("node-appwrite");
const middleware_1 = require("./lib/middleware");
const config_1 = require("./lib/config");
const STEAM_API_BASE = 'https://api.steampowered.com';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSteamJson(url) {
    const response = await fetch(url);
    return response.json();
}
// Configuration - DATABASE_ID imported from config
async function verifySteamAccess(databases, authUserId, steamId) {
    if (!authUserId)
        return false;
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, [
        node_appwrite_1.Query.equal('userId', authUserId),
        node_appwrite_1.Query.equal('steamId', steamId),
        node_appwrite_1.Query.limit(1),
    ]);
    return docs.documents.length > 0;
}
// Steam API Functions
exports.steamApi = {
    /**
     * Get Steam player summary
     */
    async getPlayerSummary(steamApiKey, steamId) {
        try {
            const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`;
            const data = await fetchSteamJson(url);
            if (data.response?.players?.length > 0) {
                return data.response.players[0];
            }
            return null;
        }
        catch (error) {
            console.error('Error fetching player summary:', error);
            return null;
        }
    },
    /**
     * Get Steam friends list
     */
    async getFriendsList(steamApiKey, steamId) {
        try {
            const url = `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${steamApiKey}&steamid=${steamId}&relationship=friend`;
            const data = await fetchSteamJson(url);
            return data.friendslist?.friends || [];
        }
        catch (error) {
            console.error('Error fetching friends list:', error);
            return [];
        }
    },
    /**
     * Get friends with their summaries
     */
    async getFriendsWithSummaries(steamApiKey, steamId) {
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
        }
        catch (error) {
            console.error('Error fetching friends with summaries:', error);
            return [];
        }
    },
    /**
     * Get owned games for a user
     */
    async getOwnedGames(steamApiKey, steamId, includeAppInfo = true) {
        try {
            const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=${includeAppInfo ? 1 : 0}&include_played_free_games=1`;
            const data = await fetchSteamJson(url);
            return data.response?.games || [];
        }
        catch (error) {
            console.error('Error fetching owned games:', error);
            return [];
        }
    },
    /**
     * Get recently played games
     */
    async getRecentlyPlayedGames(steamApiKey, steamId, count = 10) {
        try {
            const url = `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${steamApiKey}&steamid=${steamId}&count=${count}`;
            const data = await fetchSteamJson(url);
            return data.response?.games || [];
        }
        catch (error) {
            console.error('Error fetching recently played games:', error);
            return [];
        }
    },
    /**
     * Get game achievements for a user
     */
    async getPlayerAchievements(steamApiKey, steamId, appId) {
        try {
            const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}`;
            const data = await fetchSteamJson(url);
            if (data.playerstats?.success) {
                return data.playerstats.achievements || [];
            }
            return [];
        }
        catch (error) {
            console.error('Error fetching player achievements:', error);
            return [];
        }
    },
    /**
     * Get game achievement schema (names, descriptions, icons)
     */
    async getGameAchievementSchema(steamApiKey, appId) {
        try {
            const url = `${STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}`;
            const data = await fetchSteamJson(url);
            return data.game?.availableGameStats?.achievements || [];
        }
        catch (error) {
            console.error('Error fetching achievement schema:', error);
            return [];
        }
    },
    /**
     * Get full achievements with schema data
     */
    async getFullAchievements(steamApiKey, steamId, appId) {
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
        }
        catch (error) {
            console.error('Error fetching full achievements:', error);
            return [];
        }
    },
    /**
     * Get user's Steam level
     */
    async getSteamLevel(steamApiKey, steamId) {
        try {
            const url = `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${steamApiKey}&steamid=${steamId}`;
            const data = await fetchSteamJson(url);
            return data.response?.player_level || 0;
        }
        catch (error) {
            console.error('Error fetching Steam level:', error);
            return 0;
        }
    },
    /**
     * Validate Steam ID by checking if profile exists
     */
    async validateSteamId(steamApiKey, steamId) {
        const player = await this.getPlayerSummary(steamApiKey, steamId);
        return player !== null;
    },
    /**
     * Resolve vanity URL to Steam ID
     */
    async resolveVanityUrl(steamApiKey, vanityUrl) {
        try {
            const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${steamApiKey}&vanityurl=${vanityUrl}`;
            const data = await fetchSteamJson(url);
            if (data.response?.success === 1) {
                return data.response.steamid;
            }
            return null;
        }
        catch (error) {
            console.error('Error resolving vanity URL:', error);
            return null;
        }
    },
    /**
     * Calculate total playtime across all games
     */
    calculateTotalPlaytime(games) {
        return games.reduce((total, game) => total + (game.playtime_forever || 0), 0);
    },
    /**
     * Get user's complete stats summary
     */
    async getUserStatsSummary(steamApiKey, steamId) {
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
        }
        catch (error) {
            console.error('Error fetching user stats summary:', error);
            return null;
        }
    },
};
// Appwrite Function Handlers
async function handleSteamApiRequest(req, res, logger) {
    const log = logger?.log || console.log;
    const logError = logger?.error || console.error;
    log('[Steam] handler invoked');
    const client = new node_appwrite_1.Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT || config_1.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID || config_1.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY || config_1.APPWRITE_API_KEY);
    const databases = new node_appwrite_1.Databases(client);
    const steamApiKey = process.env.STEAM_API_KEY || '';
    const body = JSON.parse(req.payload || req.body || '{}');
    const { action, steamId, userId: bodyUserId, appId } = body;
    const authUserId = await (0, middleware_1.verifyAuth)(req);
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
                const data = await exports.steamApi.getPlayerSummary(steamApiKey, steamId);
                return res.json({ success: true, data });
            }
            case 'getFriends': {
                const data = await exports.steamApi.getFriendsWithSummaries(steamApiKey, steamId);
                if (authUserId) {
                    await cacheFriendsData(databases, authUserId, steamId, data);
                }
                return res.json({ success: true, data });
            }
            case 'getOwnedGames': {
                const data = await exports.steamApi.getOwnedGames(steamApiKey, steamId);
                return res.json({ success: true, data });
            }
            case 'getAchievements': {
                if (!appId) {
                    return res.json({ success: false, error: 'appId is required' });
                }
                const data = await exports.steamApi.getFullAchievements(steamApiKey, steamId, parseInt(appId));
                // Cache achievements if userId provided
                if (userId) {
                    await cacheAchievementsData(databases, userId, steamId, appId, data);
                }
                return res.json({ success: true, data });
            }
            case 'getStatsSummary': {
                const data = await exports.steamApi.getUserStatsSummary(steamApiKey, steamId);
                // Cache stats if userId provided
                if (userId && data) {
                    await cacheStatsData(databases, userId, steamId, data.stats);
                }
                return res.json({ success: true, data });
            }
            case 'validateSteamId': {
                const isValid = await exports.steamApi.validateSteamId(steamApiKey, steamId);
                return res.json({ success: true, data: { isValid } });
            }
            case 'resolveVanityUrl': {
                const resolvedSteamId = await exports.steamApi.resolveVanityUrl(steamApiKey, steamId);
                return res.json({ success: true, data: { steamId: resolvedSteamId } });
            }
            case 'getCachedFriends': {
                if (!authUserId) {
                    return res.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, 401);
                }
                const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.steamFriendsCache, [
                    node_appwrite_1.Query.equal('userId', authUserId),
                    node_appwrite_1.Query.limit(1),
                ]);
                if (docs.documents.length === 0) {
                    return res.json({ success: true, data: null });
                }
                const friendsData = docs.documents[0].friendsData;
                return res.json({ success: true, data: JSON.parse(friendsData || '[]') });
            }
            default:
                return res.json({ success: false, error: 'Unknown action' });
        }
    }
    catch (error) {
        console.error('Steam API error:', error);
        return res.json({ success: false, error: 'Steam API request failed' });
    }
}
// Cache helper functions
async function cacheFriendsData(databases, userId, steamId, data) {
    try {
        const existing = await databases.listDocuments(config_1.DATABASE_ID, 'steam_friends_cache', [node_appwrite_1.Query.equal('userId', userId)]);
        const docData = {
            userId,
            steamId,
            friendsData: JSON.stringify(data),
            lastUpdated: new Date().toISOString(),
        };
        if (existing.documents.length > 0) {
            await databases.updateDocument(config_1.DATABASE_ID, 'steam_friends_cache', existing.documents[0].$id, docData);
        }
        else {
            await databases.createDocument(config_1.DATABASE_ID, 'steam_friends_cache', 'unique()', docData);
        }
    }
    catch (error) {
        console.error('Error caching friends data:', error);
    }
}
async function cacheAchievementsData(databases, userId, steamId, gameId, data) {
    try {
        const existing = await databases.listDocuments(config_1.DATABASE_ID, 'steam_achievements_cache', [node_appwrite_1.Query.equal('userId', userId), node_appwrite_1.Query.equal('gameId', gameId)]);
        const docData = {
            userId,
            steamId,
            gameId,
            achievementsData: JSON.stringify(data),
            lastUpdated: new Date().toISOString(),
        };
        if (existing.documents.length > 0) {
            await databases.updateDocument(config_1.DATABASE_ID, 'steam_achievements_cache', existing.documents[0].$id, docData);
        }
        else {
            await databases.createDocument(config_1.DATABASE_ID, 'steam_achievements_cache', 'unique()', docData);
        }
    }
    catch (error) {
        console.error('Error caching achievements data:', error);
    }
}
async function cacheStatsData(databases, userId, steamId, stats) {
    try {
        const existing = await databases.listDocuments(config_1.DATABASE_ID, 'steam_stats_cache', [node_appwrite_1.Query.equal('userId', userId)]);
        const docData = {
            userId,
            steamId,
            gamesOwned: stats.gamesOwned,
            totalPlaytime: stats.totalPlaytime,
            recentlyPlayedData: JSON.stringify(stats.recentGames),
            lastUpdated: new Date().toISOString(),
        };
        if (existing.documents.length > 0) {
            await databases.updateDocument(config_1.DATABASE_ID, 'steam_stats_cache', existing.documents[0].$id, docData);
        }
        else {
            await databases.createDocument(config_1.DATABASE_ID, 'steam_stats_cache', 'unique()', docData);
        }
    }
    catch (error) {
        console.error('Error caching stats data:', error);
    }
}
