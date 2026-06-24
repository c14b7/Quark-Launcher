"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUCKETS = exports.COLLECTIONS = exports.DATABASE_ID = exports.STEAM_API_KEY = exports.APPWRITE_API_KEY = exports.APPWRITE_PROJECT_ID = exports.APPWRITE_ENDPOINT = void 0;
exports.APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
exports.APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
exports.APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
exports.STEAM_API_KEY = process.env.STEAM_API_KEY || '';
exports.DATABASE_ID = 'quark_launcher_db';
exports.COLLECTIONS = {
    userProfiles: 'user_profiles',
    steamIntegrations: 'steam_integrations',
    friendRequests: 'friend_requests',
    friendships: 'friendships',
    rateLimits: 'rate_limits',
    steamFriendsCache: 'steam_friends_cache',
    steamAchievementsCache: 'steam_achievements_cache',
    steamStatsCache: 'steam_stats_cache',
    telemetryInstallations: 'telemetry_installations',
    telemetrySessions: 'telemetry_sessions',
    telemetryEvents: 'telemetry_events',
    telemetryLogs: 'telemetry_logs',
};
exports.BUCKETS = {
    userMedia: 'user_media',
};
