export const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
export const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
export const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
export const DATABASE_ID = 'quark_launcher_db';

export const COLLECTIONS = {
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
} as const;

export const BUCKETS = {
  userMedia: 'user_media',
} as const;
